//libflac function wrappers

/**
 * HELPER read/extract stream info meta-data from frame header / meta-data
 * @param {POINTER} p_streaminfo
 * @returns StreamInfo
 */
function _readStreamInfo(p_streaminfo){//-> FLAC__StreamMetadata.type (FLAC__MetadataType) === FLAC__METADATA_TYPE_STREAMINFO (0)

	/*
	typedef struct {
		unsigned min_blocksize, max_blocksize;
		unsigned min_framesize, max_framesize;
		unsigned sample_rate;
		unsigned channels;
		unsigned bits_per_sample;
		FLAC__uint64 total_samples;
		FLAC__byte md5sum[16];
	} FLAC__StreamMetadata_StreamInfo;
	 */

	var min_blocksize = Module.getValue(p_streaminfo,'i32');//4 bytes
	var max_blocksize = Module.getValue(p_streaminfo+4,'i32');//4 bytes

	var min_framesize = Module.getValue(p_streaminfo+8,'i32');//4 bytes
	var max_framesize = Module.getValue(p_streaminfo+12,'i32');//4 bytes

	var sample_rate = Module.getValue(p_streaminfo+16,'i32');//4 bytes
	var channels = Module.getValue(p_streaminfo+20,'i32');//4 bytes

	var bits_per_sample = Module.getValue(p_streaminfo+24,'i32');//4 bytes

	//FIXME should be at p_streaminfo+28, but seems to be at p_streaminfo+32
	var total_samples = Module.getValue(p_streaminfo+32,'i64');//8 bytes

	var md5sum = _readMd5(p_streaminfo+40);//16 bytes

	return {
		min_blocksize: min_blocksize,
		max_blocksize: max_blocksize,
		min_framesize: min_framesize,
		max_framesize: max_framesize,
		sampleRate: sample_rate,
		channels: channels,
		bitsPerSample: bits_per_sample,
		total_samples: total_samples,
		md5sum: md5sum
	};
}

/**
 * read MD5 checksum
 * @param {POINTER} p_md5
 * @returns {String} as HEX string representation
 */
function _readMd5(p_md5){

	var sb = [], v, str;
	for(var i=0, len = 16; i < len; ++i){
		v = Module.getValue(p_md5+i,'i8');//1 byte
		if(v < 0) v = 256 + v;//<- "convert" to uint8, if necessary
		str = v.toString(16);
		if(str.length < 2) str = '0' + str;//<- add padding, if necessary
		sb.push(str);
	}
	return sb.join('');
}

/**
 * HELPER: read frame data
 *
 * @param {POINTER} p_frame
 * @returns FrameHeader
 */
function _readFrameHdr(p_frame){

	/*
	typedef struct {
		unsigned blocksize;
		unsigned sample_rate;
		unsigned channels;
		FLAC__ChannelAssignment channel_assignment;
		unsigned bits_per_sample;
		FLAC__FrameNumberType number_type;
		union {
			FLAC__uint32 frame_number;
			FLAC__uint64 sample_number;
		} number;
		FLAC__uint8 crc;
	} FLAC__FrameHeader;
	 */

	var blocksize = Module.getValue(p_frame,'i32');//4 bytes
	var sample_rate = Module.getValue(p_frame+4,'i32');//4 bytes
	var channels = Module.getValue(p_frame+8,'i32');//4 bytes

	// 0: FLAC__CHANNEL_ASSIGNMENT_INDEPENDENT	independent channels
	// 1: FLAC__CHANNEL_ASSIGNMENT_LEFT_SIDE 	left+side stereo
	// 2: FLAC__CHANNEL_ASSIGNMENT_RIGHT_SIDE 	right+side stereo
	// 3: FLAC__CHANNEL_ASSIGNMENT_MID_SIDE 	mid+side stereo
	var channel_assignment = Module.getValue(p_frame+12,'i32');//4 bytes

	var bits_per_sample = Module.getValue(p_frame+16,'i32');

	// 0: FLAC__FRAME_NUMBER_TYPE_FRAME_NUMBER 	number contains the frame number
	// 1: FLAC__FRAME_NUMBER_TYPE_SAMPLE_NUMBER	number contains the sample number of first sample in frame
	var number_type = Module.getValue(p_frame+20,'i32');

	// union {} number: The frame number or sample number of first sample in frame; use the number_type value to determine which to use.
	var frame_number = Module.getValue(p_frame+24,'i32');
	var sample_number = Module.getValue(p_frame+24,'i64');

	var number = number_type === 0? frame_number : sample_number;
	var numberType = number_type === 0? 'frames' : 'samples';

	var crc = Module.getValue(p_frame+36,'i8');

	//TODO read subframe
	//TODO read footer

	return {
		blocksize: blocksize,
		sampleRate: sample_rate,
		channels: channels,
		bitsPerSample: bits_per_sample,
		number: number,
		numberType: numberType,
		crc: crc
	};
}


/**
 * HELPER workaround / fix for returned write-buffer when decoding FLAC
 *
 * @param {number} heapOffset
 * 				the offset for the data on HEAPU8
 * @param {Uint8Array} newBuffer
 * 				the target buffer into which the data should be written -- with the correct (block) size
 * @param {boolean} applyFix
 * 				whether or not to apply the data repair heuristics
 * 				(handling duplicated/triplicated values in raw data)
 */
function __fix_write_buffer(heapOffset, newBuffer, applyFix){

	var dv = new DataView(newBuffer.buffer);
	var targetSize = newBuffer.length;

	var increase = !applyFix? 1 : 2;//<- for FIX/workaround, NOTE: e.g. if 24-bit padding occurres, there is no fix/increase needed (more details comment below)
	var buffer = HEAPU8.subarray(heapOffset, heapOffset + targetSize * increase);

	// FIXME for some reason, the bytes values 0 (min) and 255 (max) get "triplicated",
	//		or inserted "doubled" which should be ignored, i.e.
	//		x x x	-> x
	//		x x		-> <ignored>
	//		where x is 0 or 255
	// -> HACK for now: remove/"over-read" 2 of the values, for each of these triplets/doublications
	var jump, isPrint;
	for(var i=0, j=0, size = buffer.length; i < size && j < targetSize; ++i, ++j){

		if(i === size-1 && j < targetSize - 1){
			//increase heap-view, in order to read more (valid) data into the target buffer
			buffer = HEAPU8.subarray(heapOffset, size + targetSize);
			size = buffer.length;
		}

		// NOTE if e.g. 24-bit padding occurres, there does not seem to be no duplication/triplication of 255 or 0, so must not try to fix!
		if(applyFix && (buffer[i] === 0 || buffer[i] === 255)){

			jump = 0;
			isPrint = true;

			if(i + 1 < size && buffer[i] === buffer[i+1]){

				++jump;

				if(i + 2 < size){
					if(buffer[i] === buffer[i+2]){
						++jump;
					} else {
						//if only 2 occurrences: ignore value
						isPrint = false;
					}
				}
			}//else: if single value: do print (an do not jump)


			if(isPrint){
				dv.setUint8(j, buffer[i]);
				if(jump === 2 && i + 3 < size && buffer[i] === buffer[i+3]){
					//special case for reducing triples in case the following value is also the same
					// (ie. something like: x x x |+ x)
					// -> then: do write the value one more time, and jump one further ahead
					// i.e. if value occurs 4 times in a row, write 2 values
					++jump;
					dv.setUint8(++j, buffer[i]);
				}
			} else {
				--j;
			}

			i += jump;//<- apply jump, if there were value duplications

		} else {
			dv.setUint8(j, buffer[i]);
		}

	}
}


// FLAC__STREAM_DECODER_READ_STATUS_CONTINUE     	The read was OK and decoding can continue.
// FLAC__STREAM_DECODER_READ_STATUS_END_OF_STREAM   The read was attempted while at the end of the stream. Note that the client must only return this value when the read callback was called when already at the end of the stream. Otherwise, if the read itself moves to the end of the stream, the client should still return the data and FLAC__STREAM_DECODER_READ_STATUS_CONTINUE, and then on the next read callback it should return FLAC__STREAM_DECODER_READ_STATUS_END_OF_STREAM with a byte count of 0.
// FLAC__STREAM_DECODER_READ_STATUS_ABORT       	An unrecoverable error occurred. The decoder will return from the process call.
var FLAC__STREAM_DECODER_READ_STATUS_CONTINUE = 0;
var FLAC__STREAM_DECODER_READ_STATUS_END_OF_STREAM = 1;
var FLAC__STREAM_DECODER_READ_STATUS_ABORT = 2;

// FLAC__STREAM_DECODER_WRITE_STATUS_CONTINUE   The write was OK and decoding can continue.
// FLAC__STREAM_DECODER_WRITE_STATUS_ABORT     	An unrecoverable error occurred. The decoder will return from the process call.
var FLAC__STREAM_DECODER_WRITE_STATUS_CONTINUE = 0;
var FLAC__STREAM_DECODER_WRITE_STATUS_ABORT = 1;

/**
 * @interface FLAC__StreamDecoderInitStatus
 * @memberOf Flac
 *
 * @property {"FLAC__STREAM_DECODER_INIT_STATUS_OK"}	0 	Initialization was successful.
 * @property {"FLAC__STREAM_DECODER_INIT_STATUS_UNSUPPORTED_CONTAINER"}	1 	The library was not compiled with support for the given container format.
 * @property {"FLAC__STREAM_DECODER_INIT_STATUS_INVALID_CALLBACKS"}	2 	A required callback was not supplied.
 * @property {"FLAC__STREAM_DECODER_INIT_STATUS_MEMORY_ALLOCATION_ERROR"}	3 	An error occurred allocating memory.
 * @property {"FLAC__STREAM_DECODER_INIT_STATUS_ERROR_OPENING_FILE"}	4 	fopen() failed in FLAC__stream_decoder_init_file() or FLAC__stream_decoder_init_ogg_file().
 * @property {"FLAC__STREAM_DECODER_INIT_STATUS_ALREADY_INITIALIZED"}	5 	FLAC__stream_decoder_init_*() was called when the decoder was already initialized, usually because FLAC__stream_decoder_finish() was not called.
 */
var FLAC__STREAM_DECODER_INIT_STATUS_OK	= 0;
var FLAC__STREAM_DECODER_INIT_STATUS_UNSUPPORTED_CONTAINER	= 1;
var FLAC__STREAM_DECODER_INIT_STATUS_INVALID_CALLBACKS	= 2;
var FLAC__STREAM_DECODER_INIT_STATUS_MEMORY_ALLOCATION_ERROR = 3;
var FLAC__STREAM_DECODER_INIT_STATUS_ERROR_OPENING_FILE = 4;
var FLAC__STREAM_DECODER_INIT_STATUS_ALREADY_INITIALIZED = 5;

/**
 * @interface FLAC__StreamEncoderInitStatus
 * @memberOf Flac
 *
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_OK"}	0 	Initialization was successful.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_ENCODER_ERROR"}	1 	General failure to set up encoder; call FLAC__stream_encoder_get_state() for cause.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_UNSUPPORTED_CONTAINER"}	2 	The library was not compiled with support for the given container format.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_CALLBACKS"}	3 	A required callback was not supplied.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_NUMBER_OF_CHANNELS"}	4 	The encoder has an invalid setting for number of channels.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_BITS_PER_SAMPLE"}	5 	The encoder has an invalid setting for bits-per-sample. FLAC supports 4-32 bps but the reference encoder currently supports only up to 24 bps.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_SAMPLE_RATE"}	6 	The encoder has an invalid setting for the input sample rate.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_BLOCK_SIZE"}	7 	The encoder has an invalid setting for the block size.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_MAX_LPC_ORDER"}	8 	The encoder has an invalid setting for the maximum LPC order.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_QLP_COEFF_PRECISION"}	9 	The encoder has an invalid setting for the precision of the quantized linear predictor coefficients.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_BLOCK_SIZE_TOO_SMALL_FOR_LPC_ORDER"}	10 	The specified block size is less than the maximum LPC order.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_NOT_STREAMABLE"}	11 	The encoder is bound to the Subset but other settings violate it.
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_METADATA"}	12 	The metadata input to the encoder is invalid, in one of the following ways:
 *																	      FLAC__stream_encoder_set_metadata() was called with a null pointer but a block count > 0
 *																	      One of the metadata blocks contains an undefined type
 *																	      It contains an illegal CUESHEET as checked by FLAC__format_cuesheet_is_legal()
 *																	      It contains an illegal SEEKTABLE as checked by FLAC__format_seektable_is_legal()
 *																	      It contains more than one SEEKTABLE block or more than one VORBIS_COMMENT block
 * @property {"FLAC__STREAM_ENCODER_INIT_STATUS_ALREADY_INITIALIZED"}	13 	FLAC__stream_encoder_init_*() was called when the encoder was already initialized, usually because FLAC__stream_encoder_finish() was not called.
 */
var FLAC__STREAM_ENCODER_INIT_STATUS_OK = 0;
var FLAC__STREAM_ENCODER_INIT_STATUS_ENCODER_ERROR = 1;
var FLAC__STREAM_ENCODER_INIT_STATUS_UNSUPPORTED_CONTAINER = 2;
var FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_CALLBACKS = 3;
var FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_NUMBER_OF_CHANNELS = 4;
var FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_BITS_PER_SAMPLE = 5;
var FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_SAMPLE_RATE = 6;
var FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_BLOCK_SIZE = 7;
var FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_MAX_LPC_ORDER = 8;
var FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_QLP_COEFF_PRECISION = 9;
var FLAC__STREAM_ENCODER_INIT_STATUS_BLOCK_SIZE_TOO_SMALL_FOR_LPC_ORDER = 10;
var FLAC__STREAM_ENCODER_INIT_STATUS_NOT_STREAMABLE = 11;
var FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_METADATA = 12;
var FLAC__STREAM_ENCODER_INIT_STATUS_ALREADY_INITIALIZED = 13;

//FLAC__STREAM_ENCODER_WRITE_STATUS_OK 				The write was OK and encoding can continue.
//FLAC__STREAM_ENCODER_WRITE_STATUS_FATAL_ERROR		An unrecoverable error occurred. The encoder will return from the process call
var FLAC__STREAM_ENCODER_WRITE_STATUS_OK = 0;
var FLAC__STREAM_ENCODER_WRITE_STATUS_FATAL_ERROR = 1;


/**
 * Map for encoder/decoder callback functions
 *
 * <pre>[ID] -> {function_type: FUNCTION}</pre>
 *
 * type: {[id: number]: {[callback_type: string]: function}}
 * @private
 */
var coders = {};

/**
 * Get a registered callback for the encoder / decoder instance
 *
 * @param {Number} p_coder
 * 			the encoder/decoder pointer (ID)
 * @param {String} func_type
 * 			the callback type, one of
 * 				"write" | "read" | "error" | "metadata"
 * @returns {Function} the callback (or VOID if there is no callback registered)
 * @private
 */
function getCallback(p_coder, func_type){
	if(coders[p_coder]){
		return coders[p_coder][func_type];
	}
}

/**
 * Register a callback for an encoder / decoder instance (will / should be deleted, when finish()/delete())
 *
 * @param {Number} p_coder
 * 			the encoder/decoder pointer (ID)
 * @param {String} func_type
 * 			the callback type, one of
 * 				"write" | "read" | "error" | "metadata"
 * @param {Function} callback
 * 			the callback function
 * @private
 */
function setCallback(p_coder, func_type, callback){
	if(!coders[p_coder]){
		coders[p_coder] = {};
	}
	coders[p_coder][func_type] = callback;
}

//(const FLAC__StreamEncoder *encoder, const FLAC__byte buffer[], size_t bytes, unsigned samples, unsigned current_frame, void *client_data)
// -> FLAC__StreamEncoderWriteStatus
var enc_write_fn_ptr = addFunction(function(p_encoder, buffer, bytes, samples, current_frame, p_client_data){
	var retdata = new Uint8Array(bytes);
	retdata.set(HEAPU8.subarray(buffer, buffer + bytes));
	var write_callback_fn = getCallback(p_encoder, 'write');
	try{
		write_callback_fn(retdata, bytes, samples, current_frame, p_client_data);
	} catch(err) {
		console.error(err);
		return FLAC__STREAM_ENCODER_WRITE_STATUS_FATAL_ERROR;
	}
	return FLAC__STREAM_ENCODER_WRITE_STATUS_OK;
}, 'iiiiiii');

//(const FLAC__StreamDecoder *decoder, FLAC__byte buffer[], size_t *bytes, void *client_data)
// -> FLAC__StreamDecoderReadStatus
var dec_read_fn_ptr = addFunction(function(p_decoder, buffer, bytes, p_client_data){
	//FLAC__StreamDecoderReadCallback, see https://xiph.org/flac/api/group__flac__stream__decoder.html#ga7a5f593b9bc2d163884348b48c4285fd

	var len = Module.getValue(bytes, 'i32');

	if(len === 0){
		return FLAC__STREAM_DECODER_READ_STATUS_ABORT;
	}

	var read_callback_fn = getCallback(p_decoder, 'read');

	//callback must return object with: {buffer: TypedArray, readDataLength: number, error: boolean}
	var readResult = read_callback_fn(len, p_client_data);
	//in case of END_OF_STREAM or an error, readResult.readDataLength must be returned with 0

	var readLen = readResult.readDataLength;
	Module.setValue(bytes, readLen, 'i32');

	if(readResult.error){
		return FLAC__STREAM_DECODER_READ_STATUS_ABORT;
	}

	if(readLen === 0){
		return FLAC__STREAM_DECODER_READ_STATUS_END_OF_STREAM;
	}

	var readBuf = readResult.buffer;

	var dataHeap = new Uint8Array(Module.HEAPU8.buffer, buffer, readLen);
	dataHeap.set(new Uint8Array(readBuf));

	return FLAC__STREAM_DECODER_READ_STATUS_CONTINUE;
}, 'iiiii');

//(const FLAC__StreamDecoder *decoder, const FLAC__Frame *frame, const FLAC__int32 *const buffer[], void *client_data)
// -> FLAC__StreamDecoderWriteStatus
var dec_write_fn_ptr = addFunction(function(p_decoder, p_frame, p_buffer, p_client_data){

	// var dec = Module.getValue(p_decoder,'i32');
	// var clientData = Module.getValue(p_client_data,'i32');

	var frameInfo = _readFrameHdr(p_frame);

//	console.log(frameInfo);//DEBUG

	var channels = frameInfo.channels;
	var block_size = frameInfo.blocksize * (frameInfo.bitsPerSample / 8);

	//whether or not to apply data fixing heuristics (e.g. not needed for 24-bit samples)
	var isFix = frameInfo.bitsPerSample !== 24;

	//take padding bits into account for calculating buffer size
	// -> seems to be done for uneven byte sizes, i.e. 1 (8 bits) and 3 (24 bits)
	var padding = (frameInfo.bitsPerSample / 8)%2;
	if(padding > 0){
		block_size += frameInfo.blocksize * padding;
	}

	var data = [];//<- array for the data of each channel
	var bufferOffset, _buffer;

	for(var i=0; i < channels; ++i){

		bufferOffset = Module.getValue(p_buffer + (i*4),'i32');

		_buffer = new Uint8Array(block_size);
		//FIXME HACK for "strange" data (see helper function __fix_write_buffer)
		__fix_write_buffer(bufferOffset, _buffer, isFix);

		data.push(_buffer.subarray(0, block_size));
	}

	var write_callback_fn = getCallback(p_decoder, 'write');
	var res = write_callback_fn(data, frameInfo);//, clientData);

	// FLAC__STREAM_DECODER_WRITE_STATUS_CONTINUE	The write was OK and decoding can continue.
	// FLAC__STREAM_DECODER_WRITE_STATUS_ABORT     	An unrecoverable error occurred. The decoder will return from the process call.

	return res !== false? FLAC__STREAM_DECODER_WRITE_STATUS_CONTINUE : FLAC__STREAM_DECODER_WRITE_STATUS_ABORT;
}, 'iiiii');

/**
 * Decoding error codes.
 *
 * <br>
 * If the error code is not known, value <code>FLAC__STREAM_DECODER_ERROR__UNKNOWN__</code> is used.
 *
 * @property {"FLAC__STREAM_DECODER_ERROR_STATUS_LOST_SYNC"}					0   An error in the stream caused the decoder to lose synchronization.
 * @property {"FLAC__STREAM_DECODER_ERROR_STATUS_BAD_HEADER"}  				1   The decoder encountered a corrupted frame header.
 * @property {"FLAC__STREAM_DECODER_ERROR_STATUS_FRAME_CRC_MISMATCH"}	2   The frame's data did not match the CRC in the footer.
 * @property {"FLAC__STREAM_DECODER_ERROR_STATUS_UNPARSEABLE_STREAM"}	3   The decoder encountered reserved fields in use in the stream.
 *
 *
 * @interface FLAC__StreamDecoderErrorStatus
 * @memberOf Flac
 */
var DecoderErrorCode = {
	0: 'FLAC__STREAM_DECODER_ERROR_STATUS_LOST_SYNC',
	1: 'FLAC__STREAM_DECODER_ERROR_STATUS_BAD_HEADER',
	2: 'FLAC__STREAM_DECODER_ERROR_STATUS_FRAME_CRC_MISMATCH',
	3: 'FLAC__STREAM_DECODER_ERROR_STATUS_UNPARSEABLE_STREAM'
}

//(const FLAC__StreamDecoder *decoder, FLAC__StreamDecoderErrorStatus status, void *client_data)
// -> void
var dec_error_fn_ptr = addFunction(function(p_decoder, err, p_client_data){

	//err:
	var msg = DecoderErrorCode[err] || 'FLAC__STREAM_DECODER_ERROR__UNKNOWN__';//<- this should never happen;

	var error_callback_fn = getCallback(p_decoder, 'error');
	error_callback_fn(err, msg, p_client_data);
}, 'viii');

//(const FLAC__StreamDecoder *decoder, const FLAC__StreamMetadata *metadata, void *client_data) -> void
//(const FLAC__StreamEncoder *encoder, const FLAC__StreamMetadata *metadata, void *client_data) -> void
var metadata_fn_ptr = addFunction(function(p_coder, p_metadata, p_client_data){
	/*
	 typedef struct {
		FLAC__MetadataType type;
		FLAC__bool is_last;
		unsigned length;
		union {
			FLAC__StreamMetadata_StreamInfo stream_info;
			FLAC__StreamMetadata_Padding padding;
			FLAC__StreamMetadata_Application application;
			FLAC__StreamMetadata_SeekTable seek_table;
			FLAC__StreamMetadata_VorbisComment vorbis_comment;
			FLAC__StreamMetadata_CueSheet cue_sheet;
			FLAC__StreamMetadata_Picture picture;
			FLAC__StreamMetadata_Unknown unknown;
		} data;
	} FLAC__StreamMetadata;
	 */

	/*
	FLAC__METADATA_TYPE_STREAMINFO 		STREAMINFO block
	FLAC__METADATA_TYPE_PADDING 		PADDING block
	FLAC__METADATA_TYPE_APPLICATION 	APPLICATION block
	FLAC__METADATA_TYPE_SEEKTABLE 		SEEKTABLE block
	FLAC__METADATA_TYPE_VORBIS_COMMENT 	VORBISCOMMENT block (a.k.a. FLAC tags)
	FLAC__METADATA_TYPE_CUESHEET 		CUESHEET block
	FLAC__METADATA_TYPE_PICTURE 		PICTURE block
	FLAC__METADATA_TYPE_UNDEFINED 		marker to denote beginning of undefined type range; this number will increase as new metadata types are added
	FLAC__MAX_METADATA_TYPE 			No type will ever be greater than this. There is not enough room in the protocol block.
	 */

	var type = Module.getValue(p_metadata,'i32');//4 bytes
	var is_last = Module.getValue(p_metadata+4,'i32');//4 bytes
	var length = Module.getValue(p_metadata+8,'i64');//8 bytes

	var metadata_callback_fn = getCallback(p_coder, 'metadata');
	var meta_data;
	if(type === 0){// === FLAC__METADATA_TYPE_STREAMINFO
		meta_data = _readStreamInfo(p_metadata+16);

		metadata_callback_fn(meta_data);
	}
	//TODO handle other meta data too

}, 'viii');


////////////// helper fields and functions for event handling
// see exported on()/off() functions
var listeners = {};
var persistedEvents = [];
var add_event_listener = function (eventName, listener){
	var list = listeners[eventName];
	if(!list){
		list = [listener];
		listeners[eventName] = list;
	} else {
		list.push(listener);
	}
	check_and_trigger_persisted_event(eventName, listener);
};
var check_and_trigger_persisted_event = function(eventName, listener){
	var activated;
	for(var i=persistedEvents.length-1; i >= 0; --i){
		activated = persistedEvents[i];
		if(activated && activated.event === eventName){
			listener.apply(null, activated.args);
			break;
		}
	}
};
var remove_event_listener = function (eventName, listener){
	var list = listeners[eventName];
	if(list){
		for(var i=list.length-1; i >= 0; --i){
			if(list[i] === listener){
				list.splice(i, 1);
			}
		}
	}
};
/**
 * HELPER: fire an event
 * @param  {string} eventName
 * 										the event name
 * @param  {Array<any>} [args] OPITIONAL
 * 										the arguments when triggering the listeners
 * @param  {boolean} [isPersist] OPTIONAL (positinal argument!)
 * 										if TRUE, handlers for this event that will be registered after this will get triggered immediately
 * 										(i.e. event is "persistent": once triggered it stays "active")
 *
 */
var do_fire_event = function (eventName, args, isPersist){
	if(_exported['on'+eventName]){
		_exported['on'+eventName].apply(null, args);
	}
	var list = listeners[eventName];
	if(list){
		for(var i=0, size=list.length; i < size; ++i){
			list[i].apply(null, args)
		}
	}
	if(isPersist){
		persistedEvents.push({event: eventName, args: args});
	}
}

/////////////////////////////////////    export / public: /////////////////////////////////////////////
/**
 * The <code>Flac</code> module that provides functionality
 * for encoding WAV/PCM audio to Flac and decoding Flac to PCM.
 *
 * <br/><br/>
 * <p>
 * NOTE most functions are named analogous to the original C library functions,
 *      so that its documentation may be used for further reading.
 * </p>
 *
 * @see https://xiph.org/flac/api/group__flac__stream__encoder.html
 * @see https://xiph.org/flac/api/group__flac__stream__decoder.html
 *
 * @class Flac
 * @namespace Flac
 */
var _exported = {
	_module: Module,//internal: reference to Flac module
	_clear_enc_cb: function(enc_ptr){//internal function: remove reference to encoder instance and its callbacks
		delete coders[enc_ptr];
	},
	_clear_dec_cb: function(dec_ptr){//internal function: remove reference to decoder instance and its callbacks
		delete coders[dec_ptr];
	},
	/**
	 * Returns if Flac has been initialized / is ready to be used.
	 *
	 * @returns {boolean} <code>true</code>, if Flac is ready to be used
	 *
	 * @memberOf Flac#
	 * @function
	 * @see #onready
	 * @see #on
	 */
	isReady: function() { return _flac_ready; },
	/**
	 * Hook for handler function that gets called, when asynchronous initialization has finished.
	 *
	 * NOTE that if the execution environment does not support <code>Object#defineProperty</code>, then
	 *      this function is not called, after {@link #isReady} is <code>true</code>.
	 *      In this case, {@link #isReady} should be checked, before setting <code>onready</code>
	 *      and if it is <code>true</code>, handler should be executed immediately instead of setting <code>onready</code>.
	 *
	 * @memberOf Flac#
	 * @function
	 * @param {Flac.event:ReadyEvent} event the ready-event object
	 * @see #isReady
	 * @see #on
	 * @default undefined
	 * @example
	 *  // [1] if Object.defineProperty() IS supported:
	 *  Flac.onready = function(event){
	 *     //gets executed when library becomes ready, or immediately, if it already is ready...
	 *	   doSomethingWithFlac();
	 *  };
	 *
	 *  // [2] if Object.defineProperty() is NOT supported:
	 *	// do check Flac.isReady(), and only set handler, if not ready yet
	 *  // (otherwise immediately excute handler code)
	 *  if(!Flac.isReady()){
	 *    Flac.onready = function(event){
	 *       //gets executed when library becomes ready...
	 *		 doSomethingWithFlac();
	 *    };
	 *  } else {
	 * 		// Flac is already ready: immediately start processing
	 *		doSomethingWithFlac();
	 *	}
	 */
	onready: void(0),
	/**
	 * Ready event: is fired when the library has been initialized and is ready to be used
	 * (e.g. asynchronous loading of binary / WASM modules has been completed).
	 *
	 * Before this event is fired, use of functions related to encoding and decoding may
	 * cause errors.
	 *
	 * @event ReadyEvent
	 * @memberOf Flac
	 * @type {object}
	 * @property {string} type 	the type of the event <code>"ready"</code>
	 * @property {Flac} target 	the initalized FLAC library instance
	 *
	 * @see #isReady
	 * @see #on
	 */
	/**
	 * Add an event listener for module-events.
	 * Supported events:
	 * <ul>
	 *  <li> <code>"ready"</code> &rarr; {@link Flac.event:ReadyEvent}: emitted when module is ready for usage (i.e. {@link #isReady} is true)<br/>
	 *             <em>NOTE listener will get immediately triggered if module is already <code>"ready"</code></em>
	 *  </li>
	 * </ul>
	 *
	 * @param {string} eventName
	 * @param {Function} listener
	 *
	 * @memberOf Flac#
	 * @function
	 * @see #off
	 * @see #onready
	 * @see Flac.event:ReadyEvent
	 * @example
	 *  Flac.on('ready', function(event){
	 *     //gets executed when library is ready, or becomes ready...
	 *  });
	 */
	on: add_event_listener,
	/**
	 * Remove an event listener for module-events.
	 * @param {string} eventName
	 * @param {Function} listener
	 *
	 * @memberOf Flac#
	 * @function
	 * @see #on
	 */
	off: remove_event_listener,

	/**
	 * Set the "verify" flag. If true, the encoder will verify it's own encoded output by feeding it through an internal decoder and comparing the original signal against the decoded signal. If a mismatch occurs, the process call will return false. Note that this will slow the encoding process by the extra time required for decoding and comparison.
	 *
	 * <p>
	 * NOTE: only use on un-initilized encoder instances!
	 *
	 * @param {number} encoder
	 * 				the ID of the encoder instance
	 *
	 * @param {boolean} is_verify enable/disable checksum verification during encoding
	 *
	 * @returns {boolean} <code>false</code> if the encoder is already initialized, else <code>true</code>
	 *
	 * @see #create_libflac_encoder
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_encoder_set_verify: Module.cwrap('FLAC__stream_encoder_set_verify', 'number', [ 'number', 'number' ]),
	/**
	 * Set the compression level
	 *
	 * The compression level is roughly proportional to the amount of effort the encoder expends to compress the file. A higher level usually means more computation but higher compression. The default level is suitable for most applications.
	 *
	 * Currently the levels range from 0 (fastest, least compression) to 8 (slowest, most compression). A value larger than 8 will be treated as 8.
	 *
	 *
	 * <p>
	 * NOTE: only use on un-initilized encoder instances!
	 *
	 * @param {number} encoder
	 * 				the ID of the encoder instance
	 *
	 * @param {number} compression_level the desired Flac compression level: [0, 8]
	 *
	 * @returns {boolean} <code>false</code> if the encoder is already initialized, else <code>true</code>
	 *
	 * @see #create_libflac_encoder
	 * @see <a href="https://xiph.org/flac/api/group__flac__stream__encoder.html#gae49cf32f5256cb47eecd33779493ac85">FLAC API for FLAC__stream_encoder_set_compression_level()</a>
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_encoder_set_compression_level: Module.cwrap('FLAC__stream_encoder_set_compression_level', 'number', [ 'number', 'number' ]),
	/**
	 * Set the blocksize to use while encoding.
	 * The number of samples to use per frame. Use 0 to let the encoder estimate a blocksize; this is usually best.
	 *
	 * <p>
	 * NOTE: only use on un-initilized encoder instances!
	 *
	 * @param {number} encoder
	 * 				the ID of the encoder instance
	 *
	 * @param {number} block_size  the number of samples to use per frame
	 *
	 * @returns {boolean} <code>false</code> if the encoder is already initialized, else <code>true</code>
	 *
	 * @see #create_libflac_encoder
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_encoder_set_blocksize: Module.cwrap('FLAC__stream_encoder_set_blocksize', 'number', [ 'number', 'number']),
/*

TODO export other encoder API functions?:

FLAC__StreamEncoder * 	FLAC__stream_encoder_new (void)

FLAC__bool 	FLAC__stream_encoder_set_channels (FLAC__StreamEncoder *encoder, unsigned value)

FLAC__bool 	FLAC__stream_encoder_set_bits_per_sample (FLAC__StreamEncoder *encoder, unsigned value)

FLAC__bool 	FLAC__stream_encoder_set_sample_rate (FLAC__StreamEncoder *encoder, unsigned value)

FLAC__bool 	FLAC__stream_encoder_set_do_mid_side_stereo (FLAC__StreamEncoder *encoder, FLAC__bool value)

FLAC__bool 	FLAC__stream_encoder_set_loose_mid_side_stereo (FLAC__StreamEncoder *encoder, FLAC__bool value)

FLAC__bool 	FLAC__stream_encoder_set_apodization (FLAC__StreamEncoder *encoder, const char *specification)

FLAC__bool 	FLAC__stream_encoder_set_max_lpc_order (FLAC__StreamEncoder *encoder, unsigned value)

FLAC__bool 	FLAC__stream_encoder_set_qlp_coeff_precision (FLAC__StreamEncoder *encoder, unsigned value)

FLAC__bool 	FLAC__stream_encoder_set_do_qlp_coeff_prec_search (FLAC__StreamEncoder *encoder, FLAC__bool value)

FLAC__bool 	FLAC__stream_encoder_set_do_escape_coding (FLAC__StreamEncoder *encoder, FLAC__bool value)

FLAC__bool 	FLAC__stream_encoder_set_do_exhaustive_model_search (FLAC__StreamEncoder *encoder, FLAC__bool value)

FLAC__bool 	FLAC__stream_encoder_set_min_residual_partition_order (FLAC__StreamEncoder *encoder, unsigned value)

FLAC__bool 	FLAC__stream_encoder_set_max_residual_partition_order (FLAC__StreamEncoder *encoder, unsigned value)

FLAC__bool 	FLAC__stream_encoder_set_rice_parameter_search_dist (FLAC__StreamEncoder *encoder, unsigned value)


FLAC__StreamDecoderState 	FLAC__stream_encoder_get_verify_decoder_state (const FLAC__StreamEncoder *encoder)

FLAC__bool 	FLAC__stream_encoder_get_verify (const FLAC__StreamEncoder *encoder)

FLAC__bool 	FLAC__stream_encoder_get_streamable_subset (const FLAC__StreamEncoder *encoder)

unsigned 	FLAC__stream_encoder_get_channels (const FLAC__StreamEncoder *encoder)

unsigned 	FLAC__stream_encoder_get_bits_per_sample (const FLAC__StreamEncoder *encoder)

unsigned 	FLAC__stream_encoder_get_sample_rate (const FLAC__StreamEncoder *encoder)

unsigned 	FLAC__stream_encoder_get_blocksize (const FLAC__StreamEncoder *encoder)

FLAC__bool 	FLAC__stream_encoder_get_do_mid_side_stereo (const FLAC__StreamEncoder *encoder)

FLAC__bool 	FLAC__stream_encoder_get_loose_mid_side_stereo (const FLAC__StreamEncoder *encoder)

unsigned 	FLAC__stream_encoder_get_max_lpc_order (const FLAC__StreamEncoder *encoder)

unsigned 	FLAC__stream_encoder_get_qlp_coeff_precision (const FLAC__StreamEncoder *encoder)

FLAC__bool 	FLAC__stream_encoder_get_do_qlp_coeff_prec_search (const FLAC__StreamEncoder *encoder)

FLAC__bool 	FLAC__stream_encoder_get_do_escape_coding (const FLAC__StreamEncoder *encoder)

FLAC__bool 	FLAC__stream_encoder_get_do_exhaustive_model_search (const FLAC__StreamEncoder *encoder)

unsigned 	FLAC__stream_encoder_get_min_residual_partition_order (const FLAC__StreamEncoder *encoder)

unsigned 	FLAC__stream_encoder_get_max_residual_partition_order (const FLAC__StreamEncoder *encoder)

unsigned 	FLAC__stream_encoder_get_rice_parameter_search_dist (const FLAC__StreamEncoder *encoder)

FLAC__uint64 	FLAC__stream_encoder_get_total_samples_estimate (const FLAC__StreamEncoder *encoder)



TODO export other decoder API functions?:

FLAC__StreamDecoder * 	FLAC__stream_decoder_new (void)

FLAC__bool 	FLAC__stream_decoder_set_md5_checking (FLAC__StreamDecoder *decoder, FLAC__bool value)

FLAC__bool 	FLAC__stream_decoder_set_metadata_respond (FLAC__StreamDecoder *decoder, FLAC__MetadataType type)

FLAC__bool 	FLAC__stream_decoder_set_metadata_respond_application (FLAC__StreamDecoder *decoder, const FLAC__byte id[4])

FLAC__bool 	FLAC__stream_decoder_set_metadata_respond_all (FLAC__StreamDecoder *decoder)

FLAC__bool 	FLAC__stream_decoder_set_metadata_ignore (FLAC__StreamDecoder *decoder, FLAC__MetadataType type)

FLAC__bool 	FLAC__stream_decoder_set_metadata_ignore_application (FLAC__StreamDecoder *decoder, const FLAC__byte id[4])

FLAC__bool 	FLAC__stream_decoder_set_metadata_ignore_all (FLAC__StreamDecoder *decoder)


const char * 	FLAC__stream_decoder_get_resolved_state_string (const FLAC__StreamDecoder *decoder)

FLAC__uint64 	FLAC__stream_decoder_get_total_samples (const FLAC__StreamDecoder *decoder)

unsigned 	FLAC__stream_decoder_get_channels (const FLAC__StreamDecoder *decoder)

unsigned 	FLAC__stream_decoder_get_bits_per_sample (const FLAC__StreamDecoder *decoder)

unsigned 	FLAC__stream_decoder_get_sample_rate (const FLAC__StreamDecoder *decoder)

unsigned 	FLAC__stream_decoder_get_blocksize (const FLAC__StreamDecoder *decoder)


FLAC__bool 	FLAC__stream_decoder_flush (FLAC__StreamDecoder *decoder)

FLAC__bool 	FLAC__stream_decoder_skip_single_frame (FLAC__StreamDecoder *decoder)

 */

	/**
	 * Create an encoder.
	 *
	 * @param {number} sample_rate
	 * 					the sample rate of the input PCM data
	 * @param {number} channels
	 * 					the number of channels of the input PCM data
	 * @param {number} bps
	 * 					bits per sample of the input PCM data
	 * @param {number} compression_level
	 * 					the desired Flac compression level: [0, 8]
	 * @param {number} [total_samples] OPTIONAL
	 * 					the number of total samples of the input PCM data:<br>
	 * 					 Sets an estimate of the total samples that will be encoded.
	 * 					 This is merely an estimate and may be set to 0 if unknown.
	 * 					 This value will be written to the STREAMINFO block before encoding,
	 * 					 and can remove the need for the caller to rewrite the value later if
	 * 					 the value is known before encoding.<br>
	 * 					If specified, the it will be written into metadata of the FLAC header.<br>
	 * 					DEFAULT: 0 (i.e. unknown number of samples)
	 * @param {boolean} [is_verify] OPTIONAL
	 * 					enable/disable checksum verification during encoding<br>
	 * 					DEFAULT: true<br>
	 * 					NOTE: this argument is positional (i.e. total_samples must also be given)
	 * @param {number} [block_size] OPTIONAL
	 * 					the number of samples to use per frame.<br>
	 * 					DEFAULT: 0 (i.e. encoder sets block size automatically)
	 * 					NOTE: this argument is positional (i.e. total_samples and is_verify must also be given)
	 *
	 *
	 * @returns {number} the ID of the created encoder instance (or 0, if there was an error)
	 *
	 * @memberOf Flac#
	 * @function
	 */
	create_libflac_encoder: function(sample_rate, channels, bps, compression_level, total_samples, is_verify, block_size){
		is_verify = typeof is_verify === 'undefined'? 1 : is_verify + 0;
		total_samples = typeof total_samples === 'number'? total_samples : 0;
		block_size = typeof block_size === 'number'? block_size : 0;
		var ok = true;
		var encoder = Module.ccall('FLAC__stream_encoder_new', 'number', [ ], [ ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_verify', 'number', ['number', 'number'], [ encoder, is_verify ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_compression_level', 'number', ['number', 'number'], [ encoder, compression_level ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_channels', 'number', ['number', 'number'], [ encoder, channels ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_bits_per_sample', 'number', ['number', 'number'], [ encoder, bps ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_sample_rate', 'number', ['number', 'number'], [ encoder, sample_rate ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_blocksize', 'number', [ 'number', 'number'], [ encoder, block_size ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_total_samples_estimate', 'number', ['number', 'number'], [ encoder, total_samples ]);
		if (ok){
			return encoder;
		}
		return 0;
	},
	/**
	 * @deprecated use {@link #create_libflac_encoder} instead
	 * @memberOf Flac#
	 * @function
	 */
	init_libflac_encoder: function(){
		console.warn('Flac.init_libflac_encoder() is deprecated, use Flac.create_libflac_encoder() instead!');
		return this.create_libflac_encoder.apply(this, arguments);
	},

	/**
	 * Create a decoder.
	 *
	 * @param {boolean} [is_verify]
	 * 				enable/disable checksum verification during decoding<br>
	 * 				DEFAULT: true
	 *
	 * @returns {number} the ID of the created decoder instance (or 0, if there was an error)
	 *
	 * @memberOf Flac#
	 * @function
	 */
	create_libflac_decoder: function(is_verify){
		is_verify = typeof is_verify === 'undefined'? 1 : is_verify + 0;
		var ok = true;
		var decoder = Module.ccall('FLAC__stream_decoder_new', 'number', [ ], [ ]);
		ok &= Module.ccall('FLAC__stream_decoder_set_md5_checking', 'number', ['number', 'number'], [ decoder, is_verify ]);
		if (ok){
			return decoder;
		}
		return 0;
	},
	/**
	 * @deprecated use {@link #create_libflac_decoder} instead
	 * @memberOf Flac#
	 * @function
	 */
	init_libflac_decoder: function(){
		console.warn('Flac.init_libflac_decoder() is deprecated, use Flac.create_libflac_decoder() instead!');
		return this.create_libflac_decoder.apply(this, arguments);
	},
	/**
	 * the callback for writing the encoded FLAC data.
	 *
	 * @callback Flac~encoder_write_callback_fn
	 * @param {Uint8Array} data the encoded FLAC data
	 * @param {number} numberOfBytes the number of bytes in data
	 * @param {number} samples the number of samples encoded in data
	 * @param {number} currentFrame the number of the (current) encoded frame in data
	 * @returns {undefined | false} returning <code>false</code> indicates that an
	 * 								unrecoverable error occurred and decoding should be aborted
	 */
	/**
	 * the callback for the metadata of the encoded/decoded Flac data.
	 * @callback Flac~metadata_callback_fn
	 * @param {Flac.StreamMetadata} metadata the FLAC meta data
	 */
	/**
	 * FLAC meta data
	 * @interface Metadata
	 * @memberOf Flac
	 * @property {number}  sampleRate the sample rate (Hz)
	 * @property {number}  channels the number of channels
	 * @property {number}  bitsPerSample bits per sample
	 */
	/**
	 * FLAC stream meta data
	 * @interface StreamMetadata
	 * @memberOf Flac
	 * @augments Flac.Metadata
	 * @property {number}  min_blocksize the minimal block size (bytes)
	 * @property {number}  max_blocksize the maximal block size (bytes)
	 * @property {number}  min_framesize the minimal frame size (bytes)
	 * @property {number}  max_framesize the maximal frame size (bytes)
	 * @property {number}  total_samples the total number of (encoded/decoded) samples
	 * @property {string}  md5sum  the MD5 checksum for the decoded data (if validation is active)
	 */
	/**
	 * Initialize the encoder.
	 *
	 * @param {number} encoder
	 * 				the ID of the encoder instance that has not been initialized (or has been reset)
	 *
	 * @param {Flac~encoder_write_callback_fn} write_callback_fn
	 * 				the callback for writing the encoded Flac data:
	 * 				<pre>write_callback_fn(data: Uint8Array, numberOfBytes: Number, samples: Number, currentFrame: Number)</pre>
	 *
	 * @param {Flac~metadata_callback_fn} [metadata_callback_fn] OPTIONAL
	 * 				the callback for the metadata of the encoded Flac data:
	 * 				<pre>metadata_callback_fn(metadata: StreamMetadata)</pre>
	 *
	 * @param {number|boolean} [ogg_serial_number] OPTIONAL
	 * 				if number or <code>true</code> is specified, the encoder will be initialized to
	 * 				write to an OGG container, see {@link Flac.init_encoder_ogg_stream}:
	 * 				<code>true</code> will set a default serial number (<code>1</code>),
	 * 				if specified as number, it will be used as the stream's serial number within the ogg container.
	 *
	 * @returns {number} the encoder status (<code>0</code> for <code>FLAC__STREAM_ENCODER_INIT_STATUS_OK</code>),
	 * 					 see {@link Flac.FLAC__StreamEncoderInitStatus}
	 *
	 * @memberOf Flac#
	 * @function
	 */
	init_encoder_stream: function(encoder, write_callback_fn, metadata_callback_fn, ogg_serial_number, client_data){

		var is_ogg = (ogg_serial_number === true);
		client_data = client_data|0;

		if(typeof write_callback_fn !== 'function'){
			return FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_CALLBACKS;
		}
		setCallback(encoder, 'write', write_callback_fn);

		var __metadata_callback_fn_ptr = 0;
		if(typeof metadata_callback_fn === 'function'){
			setCallback(encoder, 'metadata', metadata_callback_fn);
			__metadata_callback_fn_ptr = metadata_fn_ptr;
		}

		//NOTE the following comments are used for auto-detecting exported functions (only change if ccall function name(s) change!):
		//	Module.ccall('FLAC__stream_encoder_init_stream'
		var func_name = 'FLAC__stream_encoder_init_stream';
		var args_types = ['number', 'number', 'number', 'number', 'number', 'number'];
		var args = [
			encoder,
			enc_write_fn_ptr,
			0,//	FLAC__StreamEncoderSeekCallback
			0,//	FLAC__StreamEncoderTellCallback
			__metadata_callback_fn_ptr,
			client_data
		];

		if(typeof ogg_serial_number === 'number'){

			is_ogg = true;

		} else if(is_ogg){//else: set default serial number for stream in OGG container

			//NOTE from FLAC docs: "It is recommended to set a serial number explicitly as the default of '0' may collide with other streams."
			ogg_serial_number = 1;
		}

		if(is_ogg){
			//NOTE the following comments are used for auto-detecting exported functions (only change if ccall function name(s) change!):
			//	Module.ccall('FLAC__stream_encoder_init_ogg_stream'
			func_name = 'FLAC__stream_encoder_init_ogg_stream';

			//2nd arg: FLAC__StreamEncoderReadCallback ptr -> duplicate first entry & insert at [1]
			args.unshift(args[0]);
			args[1] = 0;//	FLAC__StreamEncoderReadCallback

			args_types.unshift(args_types[0]);
			args_types[1] = 'number';


			//NOTE ignore BOOL return value when setting serial number, since init-call's returned
			//     status will also indicate, if encoder already has been initialized
			Module.ccall(
				'FLAC__stream_encoder_set_ogg_serial_number', 'number',
				['number', 'number'],
				[ encoder, ogg_serial_number ]
			);
		}

		var init_status = Module.ccall(func_name, 'number', args_types, args);

		return init_status;
	},
	/**
	 * Initialize the encoder for writing to an OGG container.
	 *
	 * @param {number} [ogg_serial_number] OPTIONAL
	 * 				the serial number for the stream in the OGG container
	 * 				DEFAULT: <code>1</code>
	 *
	 * @memberOf Flac#
	 * @function
	 * @copydoc #init_encoder_stream
	 */
	init_encoder_ogg_stream: function(encoder, write_callback_fn, metadata_callback_fn, ogg_serial_number, client_data){

		if(typeof ogg_serial_number !== 'number'){
			ogg_serial_number = true;
		}
		return this.init_encoder_stream(encoder, write_callback_fn, metadata_callback_fn, ogg_serial_number, client_data);
	},
	/**
	 * Result / return value for {@link Flac~decoder_read_callback_fn} callback function
	 *
	 * @interface ReadResult
	 * @memberOf Flac
	 * @property {TypedArray}  buffer  a TypedArray (e.g. Uint8Array) with the read data
	 * @property {number}  readDataLength the number of read data bytes. A number of <code>0</code> (zero) indicates that the end-of-stream is reached.
	 * @property {boolean}  [error] OPTIONAL value of <code>true</code> indicates that an error occured (decoding will be aborted)
	 */
	/**
	 * The callback for reading the FLAC data that will be decoded.
	 *
	 * @callback Flac~decoder_read_callback_fn
	 * @param {number} numberOfBytes the maximal number of bytes that the read callback can return
	 * @returns {Flac.ReadResult} the result of the reading action/request
	 */
	/**
	 * The callback for writing the decoded FLAC data.
	 *
	 * @callback Flac~decoder_write_callback_fn
	 * @param {Uint8Array[]} data array of the channels with the decoded PCM data as <code>Uint8Array</code>s
	 * @param {Flac.BlockMetadata} frameInfo the metadata information for the decoded data
	 */
	/**
	 * The callback for reporting decoding errors.
	 *
	 * @callback Flac~decoder_error_callback_fn
	 * @param {number} errorCode the error code
	 * @param {Flac.FLAC__StreamDecoderErrorStatus} errorDescription the string representation / description of the error
	 */
	/**
	 * FLAC block meta data
	 * @interface BlockMetadata
	 * @augments Flac.Metadata
	 * @memberOf Flac
	 *
	 * @property {number}  blocksize the block size (bytes)
	 * @property {number}  number the number of the decoded samples or frames
	 * @property {string}  numberType the type to which <code>number</code> refers to: either <code>"frames"</code> or <code>"samples"</code>
	 * @property {string}  crc the MD5 checksum for the decoded data, if validation is enabled
	 */
	/**
	 * Initialize the decoder.
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance that has not been initialized (or has been reset)
	 *
	 * @param {Flac~decoder_read_callback_fn} read_callback_fn
	 * 				the callback for reading the Flac data that should get decoded:
	 * 				<pre>read_callback_fn(numberOfBytes: Number) : {buffer: ArrayBuffer, readDataLength: number, error: boolean}</pre>
	 *
	 * @param {Flac~decoder_write_callback_fn} write_callback_fn
	 * 				the callback for writing the decoded data:
	 * 				<pre>write_callback_fn(data: Uint8Array[], frameInfo: Metadata)</pre>
	 *
	 * @param {Flac~decoder_error_callback_fn} [error_callback_fn] OPTIONAL
	 * 				the error callback:
	 * 				<pre>error_callback_fn(errorCode: Number, errorDescription: String)</pre>
	 *
	 * @param {Flac~metadata_callback_fn} [metadata_callback_fn] OPTIONAL
	 * 				callback for receiving the metadata of FLAC data that will be decoded:
	 * 				<pre>metadata_callback_fn(metadata: StreamMetadata)</pre>
	 *
	 * @param {number|boolean} [ogg_serial_number] OPTIONAL
	 * 				if number or <code>true</code> is specified, the decoder will be initilized to
	 * 				read from an OGG container, see {@link Flac.init_decoder_ogg_stream}:<br/>
	 * 				<code>true</code> will use the default serial number, if specified as number the
	 * 				corresponding stream with the serial number from the ogg container will be used.
	 *
	 * @returns {number} the decoder status(<code>0</code> for <code>FLAC__STREAM_DECODER_INIT_STATUS_OK</code>),
	 * 					 see {@link Flac.FLAC__StreamDecoderInitStatus}
	 *
	 * @memberOf Flac#
	 * @function
	 */
	init_decoder_stream: function(decoder, read_callback_fn, write_callback_fn, error_callback_fn, metadata_callback_fn, ogg_serial_number, client_data){

		client_data = client_data|0;

		if(typeof read_callback_fn !== 'function'){
			return FLAC__STREAM_DECODER_INIT_STATUS_INVALID_CALLBACKS;
		}
		setCallback(decoder, 'read', read_callback_fn);

		if(typeof write_callback_fn !== 'function'){
			return FLAC__STREAM_DECODER_INIT_STATUS_INVALID_CALLBACKS;
		}
		setCallback(decoder, 'write', write_callback_fn);

		var __error_callback_fn_ptr = 0;
		if(typeof error_callback_fn === 'function'){
			setCallback(decoder, 'error', error_callback_fn);
			__error_callback_fn_ptr = dec_error_fn_ptr;
		}

		var __metadata_callback_fn_ptr = 0;
		if(typeof metadata_callback_fn === 'function'){
			setCallback(decoder, 'metadata', metadata_callback_fn);
			__metadata_callback_fn_ptr = metadata_fn_ptr;
		}

		var is_ogg = (ogg_serial_number === true);
		if(typeof ogg_serial_number === 'number'){

			is_ogg = true;

			//NOTE ignore BOOL return value when setting serial number, since init-call's returned
			//     status will also indicate, if decoder already has been initialized
			Module.ccall(
				'FLAC__stream_decoder_set_ogg_serial_number', 'number',
				['number', 'number'],
				[ decoder, ogg_serial_number ]
			);
		}

		//NOTE the following comments are used for auto-detecting exported functions (only change if ccall function name(s) change!):
		//	Module.ccall('FLAC__stream_decoder_init_stream'
		//	Module.ccall('FLAC__stream_decoder_init_ogg_stream'
		var init_func_name = !is_ogg? 'FLAC__stream_decoder_init_stream' : 'FLAC__stream_decoder_init_ogg_stream';

		var init_status = Module.ccall(
				init_func_name, 'number',
				[ 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number'],
				[
					 decoder,
					 dec_read_fn_ptr,
					 0,// FLAC__StreamDecoderSeekCallback
					 0,// FLAC__StreamDecoderTellCallback
					 0,//	FLAC__StreamDecoderLengthCallback
					 0,//	FLAC__StreamDecoderEofCallback
					 dec_write_fn_ptr,
					 __metadata_callback_fn_ptr,
					 __error_callback_fn_ptr,
					 client_data
				]
		);

		return init_status;
	},
	/**
	 * Initialize the decoder for writing to an OGG container.
	 *
	 * @param {number} [ogg_serial_number] OPTIONAL
	 * 				the serial number for the stream in the OGG container that should be decoded.<br/>
	 * 				The default behavior is to use the serial number of the first Ogg page. Setting a serial number here will explicitly specify which stream is to be decoded.
	 *
	 * @memberOf Flac#
	 * @function
	 * @copydoc #init_decoder_stream
	 */
	init_decoder_ogg_stream: function(decoder, read_callback_fn, write_callback_fn, error_callback_fn, metadata_callback_fn, ogg_serial_number, client_data){

		if(typeof ogg_serial_number !== 'number'){
			ogg_serial_number = true;
		}
		return this.init_decoder_stream(decoder, read_callback_fn, write_callback_fn, error_callback_fn, metadata_callback_fn, ogg_serial_number, client_data);
	},
	/**
	 * Encode / submit data for encoding.
	 *
	 * This version allows you to supply the input data where the channels are interleaved into a
	 * single array (i.e. channel0_sample0, channel1_sample0, ... , channelN_sample0, channel0_sample1, ...).
	 *
	 * The samples need not be block-aligned but they must be sample-aligned, i.e. the first value should be
	 * channel0_sample0 and the last value channelN_sampleM.
	 *
	 * Each sample should be a signed integer, right-justified to the resolution set by bits-per-sample.
	 *
	 * For example, if the resolution is 16 bits per sample, the samples should all be in the range [-32768,32767].
	 *
	 *
	 * For applications where channel order is important, channels must follow the order as described in the frame header.
	 *
	 * @param {number} encoder
	 * 				the ID of the encoder instance
	 *
	 * @param {TypedArray} buffer
	 * 				the audio data in a typed array with signed integers (and size according to the set bits-per-sample setting)
	 *
	 * @param {number} num_of_samples
	 * 				the number of samples in buffer
	 *
	 * @returns {boolean} true if successful, else false; in this case, check the encoder state with FLAC__stream_encoder_get_state() to see what went wrong.
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_encoder_process_interleaved: function(encoder, buffer, num_of_samples){
		// get the length of the data in bytes
		var numBytes = buffer.length * buffer.BYTES_PER_ELEMENT;
		// console.log("DEBUG numBytes: " + numBytes);
		// malloc enough space for the data
		var ptr = Module._malloc(numBytes);
		// get a bytes-wise view on the newly allocated buffer
		var heapBytes= new Uint8Array(Module.HEAPU8.buffer, ptr, numBytes);
		// console.log("DEBUG heapBytes: " + heapBytes);
		// copy data into heapBytes
		heapBytes.set(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));// issue #11 (2): do use byteOffset and byteLength for copying the data in case the underlying buffer/ArrayBuffer of the TypedArray view is larger than the TypedArray
		var status = Module.ccall('FLAC__stream_encoder_process_interleaved', 'number',
				['number', 'number', 'number'],
				[encoder, heapBytes.byteOffset, num_of_samples]
		);
		Module._free(ptr);
		return status;
	},

	/**
	 * Decodes a single frame.
	 *
	 * To check decoding progress, use {@link #FLAC__stream_decoder_get_state}.
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @returns {boolean} FALSE if an error occurred
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_decoder_process_single: Module.cwrap('FLAC__stream_decoder_process_single', 'number', ['number']),

	/**
	 * Decodes data until end of stream.
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @returns {boolean} FALSE if an error occurred
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_decoder_process_until_end_of_stream: Module.cwrap('FLAC__stream_decoder_process_until_end_of_stream', 'number', ['number']),

	/**
	 * Decodes data until end of metadata.
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @returns {boolean} false if any fatal read, write, or memory allocation error occurred (meaning decoding must stop), else true.
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_decoder_process_until_end_of_metadata: Module.cwrap('FLAC__stream_decoder_process_until_end_of_metadata', 'number', ['number']),

	/**
	 * Decoder state code.
	 *
	 * @interface FLAC__StreamDecoderState
	 * @memberOf Flac
	 *
	 * @property {"FLAC__STREAM_DECODER_SEARCH_FOR_METADATA"} 		0	The decoder is ready to search for metadata
	 * @property {"FLAC__STREAM_DECODER_READ_METADATA"}  					1	The decoder is ready to or is in the process of reading metadata
	 * @property {"FLAC__STREAM_DECODER_SEARCH_FOR_FRAME_SYNC"} 	2	The decoder is ready to or is in the process of searching for the frame sync code
	 * @property {"FLAC__STREAM_DECODER_READ_FRAME"}							3	The decoder is ready to or is in the process of reading a frame
	 * @property {"FLAC__STREAM_DECODER_END_OF_STREAM"}						4	The decoder has reached the end of the stream
	 * @property {"FLAC__STREAM_DECODER_OGG_ERROR"}								5	An error occurred in the underlying Ogg layer
	 * @property {"FLAC__STREAM_DECODER_SEEK_ERROR"}							6	An error occurred while seeking. The decoder must be flushed with FLAC__stream_decoder_flush() or reset with FLAC__stream_decoder_reset() before decoding can continue
	 * @property {"FLAC__STREAM_DECODER_ABORTED"}									7	The decoder was aborted by the read callback
	 * @property {"FLAC__STREAM_DECODER_MEMORY_ALLOCATION_ERROR"}	8	An error occurred allocating memory. The decoder is in an invalid state and can no longer be used
	 * @property {"FLAC__STREAM_DECODER_UNINITIALIZED"}						9	The decoder is in the uninitialized state; one of the FLAC__stream_decoder_init_*() functions must be called before samples can be processed.
	 *
	 */
	/**
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @returns {number} the decoder state, see {@link Flac.FLAC__StreamDecoderState}
	 *
	 * @memberOf Flac#
	 * @function
	 * @see .FLAC__StreamDecoderState
	 */
	FLAC__stream_decoder_get_state: Module.cwrap('FLAC__stream_decoder_get_state', 'number', ['number']),

	/**
	 * Encoder state code.
	 *
	 * @interface FLAC__StreamEncoderState
	 * @memberOf Flac
	 *
	 * @property {"FLAC__STREAM_ENCODER_OK"}														0 	The encoder is in the normal OK state and samples can be processed.
	 * @property {"FLAC__STREAM_ENCODER_UNINITIALIZED"}									1 	The encoder is in the uninitialized state; one of the FLAC__stream_encoder_init_*() functions must be called before samples can be processed.
	 * @property {"FLAC__STREAM_ENCODER_OGG_ERROR"}											2 	An error occurred in the underlying Ogg layer.
	 * @property {"FLAC__STREAM_ENCODER_VERIFY_DECODER_ERROR"}					3 	An error occurred in the underlying verify stream decoder; check FLAC__stream_encoder_get_verify_decoder_state().
	 * @property {"FLAC__STREAM_ENCODER_VERIFY_MISMATCH_IN_AUDIO_DATA"}	4 	The verify decoder detected a mismatch between the original audio signal and the decoded audio signal.
	 * @property {"FLAC__STREAM_ENCODER_CLIENT_ERROR"}									5 	One of the callbacks returned a fatal error.
	 * @property {"FLAC__STREAM_ENCODER_IO_ERROR"}											6 	An I/O error occurred while opening/reading/writing a file. Check errno.
	 * @property {"FLAC__STREAM_ENCODER_FRAMING_ERROR"}									7 	An error occurred while writing the stream; usually, the write_callback returned an error.
	 * @property {"FLAC__STREAM_ENCODER_MEMORY_ALLOCATION_ERROR"}				8 	Memory allocation failed.
	 *
	 */
	/**
	 *
	 * @param {number} encoder
	 * 				the ID of the encoder instance
	 *
	 * @returns {number} the encoder state, see {@link Flac.FLAC__StreamEncoderState}
	 *
	 * @memberOf Flac#
	 * @function
	 * @see Flac.FLAC__StreamEncoderState
	 */
	FLAC__stream_encoder_get_state:  Module.cwrap('FLAC__stream_encoder_get_state', 'number', ['number']),

	/**
	 * Get if MD5 verification is enabled for decoder
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @returns {boolean} <code>true</code> if MD5 verification is enabled
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_decoder_get_md5_checking: Module.cwrap('FLAC__stream_decoder_get_md5_checking', 'number', ['number']),

//	/** @returns {boolean} FALSE if the decoder is already initialized, else TRUE. */
//	FLAC__stream_decoder_set_md5_checking: Module.cwrap('FLAC__stream_decoder_set_md5_checking', 'number', ['number', 'number']),

	/**
	 * Finish the encoding process.
	 *
	 * @param {number} encoder
	 * 				the ID of the encoder instance
	 *
	 * @returns {boolean} <code>false</code> if an error occurred processing the last frame;
	 * 					 or if verify mode is set, there was a verify mismatch; else <code>true</code>.
	 * 					 If <code>false</code>, caller should check the state with {@link Flac#FLAC__stream_encoder_get_state}
	 * 					 for more information about the error.
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_encoder_finish: Module.cwrap('FLAC__stream_encoder_finish', 'number', [ 'number' ]),
	/**
	 * Finish the decoding process.
	 *
	 * The decoder can be reused, after initializing it again.
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @returns {boolean} <code>false</code> if MD5 checking is on AND a STREAMINFO block was available AND the MD5 signature in
	 * 						 the STREAMINFO block was non-zero AND the signature does not match the one computed by the decoder;
	 * 						 else <code>true</code>.
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_decoder_finish: Module.cwrap('FLAC__stream_decoder_finish', 'number', [ 'number' ]),
	/**
	 * Reset the decoder for reuse.
	 *
	 * <p>
	 * NOTE: Needs to be re-initialized, before it can be used again
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @returns {boolean} true if successful
	 *
	 * @see #init_decoder_stream
	 * @see #init_decoder_ogg_stream
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_decoder_reset: Module.cwrap('FLAC__stream_decoder_reset', 'number', [ 'number' ]),
	/**
	 * Delete the encoder instance, and free up its resources.
	 *
	 * @param {number} encoder
	 * 				the ID of the encoder instance
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_encoder_delete: function(encoder){
		this._clear_enc_cb(encoder);//<- remove callback references
		return Module.ccall('FLAC__stream_encoder_delete', 'number', [ 'number' ], [encoder]);
	},
	/**
	 * Delete the decoder instance, and free up its resources.
	 *
	 * @param {number} decoder
	 * 				the ID of the decoder instance
	 *
	 * @memberOf Flac#
	 * @function
	 */
	FLAC__stream_decoder_delete: function(decoder){
		this._clear_dec_cb(decoder);//<- remove callback references
		return Module.ccall('FLAC__stream_decoder_delete', 'number', [ 'number' ], [decoder]);
	}

};//END: var _exported = {

//if Properties are supported by JS execution environment:
// support "immediate triggering" onready function, if library is already initialized when setting onready callback
if(typeof Object.defineProperty === 'function'){
	//add internal field for storing onready callback:
	_exported._onready = void(0);
	//define getter & define setter with "immediate trigger" functionality:
	Object.defineProperty(_exported, 'onready', {
		get() { return this._onready; },
		set(newValue) {
			this._onready = newValue;
			if(this.isReady()){
				check_and_trigger_persisted_event('ready', newValue);
			}
		}
	});
} else {
	//if Properties are NOTE supported by JS execution environment:
	// pring usage warning for onready hook instead
	console.warn('WARN: note that setting Flac.onready handler after Flac.isReady() is already true, will have no effect, that is, the handler function will not be triggered!');
}

if(expLib && expLib.exports){
	expLib.exports = _exported;
}
return _exported;

}));//END: UMD wrapper
