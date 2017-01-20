//libflac function wrappers

/**
 * HELPER read/extract stream info meta-data from frame header / meta-data
 * @param p_streaminfo {POINTER}
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
 * @param p_md5 {POINTER}
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
 * @param p_frame {POINTER}
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

	var crc = Module.getValue(p_frame+36,'i8');

	//TODO read subframe
	//TODO read footer

	return {
		blocksize: blocksize,
		sampleRate: sample_rate,
		channels: channels,
		bitsPerSample: bits_per_sample,
		number: number,
		crc: crc
	};
}


/**
 * HELPER workaround / fix for returned write-buffer for decoding FLAC    	 * 
 * @param buffer {Uint8Array}
 * @returns {Uint8Array}
 */
function __fix_write_buffer(buffer){
	//FIXME for some reason, the bytes values 0 (min) and 255 (max) get "triplicated"
	//		HACK for now: remove 2 of the values, for each of these triplets
	var count = 0;
	var inc;
	var isPrint;
	for(var i=0, size = buffer.length; i < size; ++i){

		if(buffer[i] === 0 || buffer[i] === 255){

			inc = 0;
			isPrint = true;

			if(i + 1 < size && buffer[i] === buffer[i+1]){

				++inc;

				if(i + 2 < size){
					if(buffer[i] === buffer[i+2]){
						++inc;
					} else {
						//if only 2 occurrences: ignore value
						isPrint = false;
					}
				}
			}//else: if single value: do print (an do not jump)


			if(isPrint){
				++count;
			}

			i += inc;

		} else {
			++count;
		}
	}

	var newBuffer = new Uint8Array(count);
	var dv = new DataView(newBuffer.buffer);
	for(var i=0, j=0, size = buffer.length; i < size; ++i, ++j){

		if(buffer[i] === 0 || buffer[i] === 255){

			inc = 0;
			isPrint = true;

			if(i + 1 < size && buffer[i] === buffer[i+1]){

				++inc;

				if(i + 2 < size){
					if(buffer[i] === buffer[i+2]){
						++inc;
					} else {
						//if only 2 occurrences: ignore value
						isPrint = false;
					}
				}
			}//else: if single value: do print (an do not jump)


			if(isPrint){
				dv.setUint8(j, buffer[i]);
			} else {
				--j;
			}

			i += inc;

		} else {
			dv.setUint8(j, buffer[i]);
		}


	}

	return newBuffer;
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

//FLAC__STREAM_DECODER_INIT_STATUS_OK						Initialization was successful.
//FLAC__STREAM_DECODER_INIT_STATUS_UNSUPPORTED_CONTAINER 	The library was not compiled with support for the given container format.
//FLAC__STREAM_DECODER_INIT_STATUS_INVALID_CALLBACKS 			A required callback was not supplied.
//FLAC__STREAM_DECODER_INIT_STATUS_MEMORY_ALLOCATION_ERROR 	An error occurred allocating memory.
//FLAC__STREAM_DECODER_INIT_STATUS_ERROR_OPENING_FILE 		fopen() failed in FLAC__stream_decoder_init_file() or FLAC__stream_decoder_init_ogg_file().
//FLAC__STREAM_DECODER_INIT_STATUS_ALREADY_INITIALIZED 		FLAC__stream_decoder_init_*() was called when the decoder was already initialized, usually because FLAC__stream_decoder_finish() was not called.
FLAC__STREAM_DECODER_INIT_STATUS_OK	= 0;
FLAC__STREAM_DECODER_INIT_STATUS_UNSUPPORTED_CONTAINER	= 1;
FLAC__STREAM_DECODER_INIT_STATUS_INVALID_CALLBACKS	= 2;
FLAC__STREAM_DECODER_INIT_STATUS_MEMORY_ALLOCATION_ERROR = 3;
FLAC__STREAM_DECODER_INIT_STATUS_ERROR_OPENING_FILE = 4;
FLAC__STREAM_DECODER_INIT_STATUS_ALREADY_INITIALIZED = 5;

//FLAC__STREAM_ENCODER_INIT_STATUS_OK									Initialization was successful.
//FLAC__STREAM_ENCODER_INIT_STATUS_ENCODER_ERROR						General failure to set up encoder; call FLAC__stream_encoder_get_state() for cause.
//FLAC__STREAM_ENCODER_INIT_STATUS_UNSUPPORTED_CONTAINER				The library was not compiled with support for the given container format.
//FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_CALLBACKS					A required callback was not supplied.
//FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_NUMBER_OF_CHANNELS			The encoder has an invalid setting for number of channels.
//FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_BITS_PER_SAMPLE				The encoder has an invalid setting for bits-per-sample. FLAC supports 4-32 bps but the reference encoder currently supports only up to 24 bps.
//FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_SAMPLE_RATE					The encoder has an invalid setting for the input sample rate.
//FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_BLOCK_SIZE					The encoder has an invalid setting for the block size.
//FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_MAX_LPC_ORDER				The encoder has an invalid setting for the maximum LPC order.
//FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_QLP_COEFF_PRECISION			The encoder has an invalid setting for the precision of the quantized linear predictor coefficients.
//FLAC__STREAM_ENCODER_INIT_STATUS_BLOCK_SIZE_TOO_SMALL_FOR_LPC_ORDER	The specified block size is less than the maximum LPC order.
//FLAC__STREAM_ENCODER_INIT_STATUS_NOT_STREAMABLE						The encoder is bound to the Subset but other settings violate it.
//FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_METADATA						The metadata input to the encoder is invalid, in one of the following ways:
//																	      FLAC__stream_encoder_set_metadata() was called with a null pointer but a block count > 0
//																	      One of the metadata blocks contains an undefined type
//																	      It contains an illegal CUESHEET as checked by FLAC__format_cuesheet_is_legal()
//																	      It contains an illegal SEEKTABLE as checked by FLAC__format_seektable_is_legal()
//																	      It contains more than one SEEKTABLE block or more than one VORBIS_COMMENT block
//FLAC__STREAM_ENCODER_INIT_STATUS_ALREADY_INITIALIZED					FLAC__stream_encoder_init_*() was called when the encoder was already initialized, usually because FLAC__stream_encoder_finish() was not called.
FLAC__STREAM_ENCODER_INIT_STATUS_OK = 0;
FLAC__STREAM_ENCODER_INIT_STATUS_ENCODER_ERROR = 1;
FLAC__STREAM_ENCODER_INIT_STATUS_UNSUPPORTED_CONTAINER = 2;
FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_CALLBACKS = 3;
FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_NUMBER_OF_CHANNELS = 4;
FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_BITS_PER_SAMPLE = 5;
FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_SAMPLE_RATE = 6;
FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_BLOCK_SIZE = 7;
FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_MAX_LPC_ORDER = 8;
FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_QLP_COEFF_PRECISION = 9;
FLAC__STREAM_ENCODER_INIT_STATUS_BLOCK_SIZE_TOO_SMALL_FOR_LPC_ORDER = 10;
FLAC__STREAM_ENCODER_INIT_STATUS_NOT_STREAMABLE = 11;
FLAC__STREAM_ENCODER_INIT_STATUS_INVALID_METADATA = 12;
FLAC__STREAM_ENCODER_INIT_STATUS_ALREADY_INITIALIZED = 13;

//FLAC__STREAM_ENCODER_WRITE_STATUS_OK 				The write was OK and encoding can continue.
//FLAC__STREAM_ENCODER_WRITE_STATUS_FATAL_ERROR		An unrecoverable error occurred. The encoder will return from the process call
FLAC__STREAM_ENCODER_WRITE_STATUS_OK = 0;
FLAC__STREAM_ENCODER_WRITE_STATUS_FATAL_ERROR = 1;


/**
 * Map for encoder/decoder callback functions
 * 
 * <pre>[ID] -> {function_type: FUNCTION}</pre>
 *  
 * @type {[id: number]: {[callback_type: string]: function}}
 */
var coders = {};

/**
 * Get a registered callback for the encoder / decoder instance
 * 
 * @param p_coder {Number}
 * 			the encoder/decoder pointer (ID)
 * @param func_type {String}
 * 			the callback type, one of
 * 				"write" | "read" | "error" | "metadata"
 * @returns {Function} the callback (or VOID if there is no callback registered)
 */
function getCallback(p_coder, func_type){
	if(coders[p_coder]){
		return coders[p_coder][func_type];
	}
}

/**
 * Register a callback for an encoder / decoder instance (will / should be deleted, when finish()/delete())
 * 
 * @param p_coder {Number}
 * 			the encoder/decoder pointer (ID)
 * @param func_type {String}
 * 			the callback type, one of
 * 				"write" | "read" | "error" | "metadata"
 * @param callback {Function}
 * 			the callback function
 */
function setCallback(p_coder, func_type, callback){
	if(!coders[p_coder]){
		coders[p_coder] = {};
	}
	coders[p_coder][func_type] = callback;
}

//(const FLAC__StreamEncoder *encoder, const FLAC__byte buffer[], size_t bytes, unsigned samples, unsigned current_frame, void *client_data)
// -> FLAC__StreamEncoderWriteStatus
var enc_write_fn_ptr = Runtime.addFunction(function(p_encoder, buffer, bytes, samples, current_frame, p_client_data){
	var arraybuf = new ArrayBuffer(buffer);
	var retdata = new Uint8Array(bytes);
	retdata.set(HEAPU8.subarray(buffer, buffer + bytes));
	var write_callback_fn = getCallback(p_encoder, 'write');
	try{
		write_callback_fn(retdata, bytes, samples, current_frame, p_client_data);
	} catch(err) {
		console.error(err);
		return FLAC__STREAM_ENCODER_WRITE_STATUS_FATAL_ERROR;
	}
	return FLAC__STREAM_ENCODER_WRITE_STATUS_OK
});

//(const FLAC__StreamDecoder *decoder, FLAC__byte buffer[], size_t *bytes, void *client_data)
// -> FLAC__StreamDecoderReadStatus
var dec_read_fn_ptr = Runtime.addFunction(function(p_decoder, buffer, bytes, p_client_data){
	//FLAC__StreamDecoderReadCallback, see https://xiph.org/flac/api/group__flac__stream__decoder.html#ga7a5f593b9bc2d163884348b48c4285fd

	var len = Module.getValue(bytes, 'i32');

	if(len === 0){
		return FLAC__STREAM_DECODER_READ_STATUS_ABORT;
	}
	
	var read_callback_fn = getCallback(p_decoder, 'read');

	//callback must return object with: {buffer: ArrayBuffer, readDataLength: number, error: boolean}
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
});

//(const FLAC__StreamDecoder *decoder, const FLAC__Frame *frame, const FLAC__int32 *const buffer[], void *client_data)
// -> FLAC__StreamDecoderWriteStatus
var dec_write_fn_ptr = Runtime.addFunction(function(p_decoder, p_frame, p_buffer, p_client_data){

	// var dec = Module.getValue(p_decoder,'i32');
	// var clientData = Module.getValue(p_client_data,'i32');

	var frameInfo = _readFrameHdr(p_frame);

//	console.log(frameInfo);//DEBUG

	var channels = frameInfo.channels;
	var block_size = frameInfo.blocksize * (frameInfo.bitsPerSample / 8);

	var increase = 2;//<- for FIX/workaround -> see comment below

	var data = [];//<- array for the data of each channel
	var buffer, heapView, _buffer;
	
	for(var i=0; i < channels; ++i){
		
		buffer = Module.getValue(p_buffer + (i*4),'i32');
	
		heapView = HEAPU8.subarray(buffer, buffer + block_size * increase);
	
		//FIXME HACK for "strange" data (see helper function __fix_write_buffer)
		_buffer = __fix_write_buffer(heapView);
		
		if(_buffer.length < block_size){
			while(_buffer.length < block_size && buffer + block_size * increase < HEAPU8.length){
				increase += 2;
				heapView = HEAPU8.subarray(buffer, buffer + block_size * increase);
				_buffer = __fix_write_buffer(heapView);
			}
		}
		data.push(_buffer.subarray(0, block_size));
	}

	var write_callback_fn = getCallback(p_decoder, 'write');
	write_callback_fn(data, frameInfo);//, clientData);

	// FLAC__STREAM_DECODER_WRITE_STATUS_CONTINUE	The write was OK and decoding can continue.
	// FLAC__STREAM_DECODER_WRITE_STATUS_ABORT     	An unrecoverable error occurred. The decoder will return from the process call.

	return FLAC__STREAM_DECODER_WRITE_STATUS_CONTINUE;
});



//(const FLAC__StreamDecoder *decoder, FLAC__StreamDecoderErrorStatus status, void *client_data)
// -> void
var dec_error_fn_ptr = Runtime.addFunction(function(p_decoder, err, p_client_data){
		
	//err:
	// FLAC__STREAM_DECODER_ERROR_STATUS_LOST_SYNC         An error in the stream caused the decoder to lose synchronization.
	// FLAC__STREAM_DECODER_ERROR_STATUS_BAD_HEADER       The decoder encountered a corrupted frame header.
	// FLAC__STREAM_DECODER_ERROR_STATUS_FRAME_CRC_MISMATCH   The frame's data did not match the CRC in the footer.
	// FLAC__STREAM_DECODER_ERROR_STATUS_UNPARSEABLE_STREAM   The decoder encountered reserved fields in use in the stream.
	var msg;
	switch(err){
	case 0:
		msg = 'FLAC__STREAM_DECODER_ERROR_STATUS_LOST_SYNC';
		break;
	case 1:
		msg = 'FLAC__STREAM_DECODER_ERROR_STATUS_BAD_HEADER';
		break;
	case 2:
		msg = 'FLAC__STREAM_DECODER_ERROR_STATUS_FRAME_CRC_MISMATCH';
		break;
	case 3:
		msg = 'FLAC__STREAM_DECODER_ERROR_STATUS_UNPARSEABLE_STREAM';
		break;
	default:
		msg = 'FLAC__STREAM_DECODER_ERROR__UNKNOWN__';//<- this should never happen
	}
	
	var error_callback_fn = getCallback(p_decoder, 'error');
	error_callback_fn(err, msg, p_client_data);
});

//(const FLAC__StreamDecoder *decoder, const FLAC__StreamMetadata *metadata, void *client_data) -> void
//(const FLAC__StreamEncoder *encoder, const FLAC__StreamMetadata *metadata, void *client_data) -> void
var metadata_fn_ptr = Runtime.addFunction(function(p_coder, p_metadata, p_client_data){
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
	
});

// export / public:
return {
	_module: Module,
	_clear_enc_cb: function(enc_ptr){
		delete coders[enc_ptr];
	},
	_clear_dec_cb: function(dec_ptr){
		delete coders[dec_ptr];
	},
	FLAC__stream_encoder_set_verify: Module.cwrap('FLAC__stream_encoder_set_verify', 'number', [ 'number' ]),
	FLAC__stream_encoder_set_compression_level: Module.cwrap('FLAC__stream_encoder_set_compression_level', 'number', [ 'number', 'number' ]),
	/* ... */

	// FLAC__StreamEncoder* init_libflac(unsigned sample_rate, unsigned channels, unsigned bps, unsigned compression_level, unsigned total_samples);
	init_libflac_encoder: function(sample_rate, channels, bps, compression_level, total_samples, is_verify){
		is_verify = typeof is_verify === 'undefined'? 1 : is_verify + 0;
		var ok = true;
		var encoder = Module.ccall('FLAC__stream_encoder_new', 'number', [ ], [ ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_verify', 'number', ['number', 'number'], [ encoder, is_verify ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_compression_level', 'number', ['number', 'number'], [ encoder, compression_level ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_channels', 'number', ['number', 'number'], [ encoder, channels ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_bits_per_sample', 'number', ['number', 'number'], [ encoder, bps ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_sample_rate', 'number', ['number', 'number'], [ encoder, sample_rate ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_total_samples_estimate', 'number', ['number', 'number'], [ encoder, total_samples ]);
		if (ok){
			return encoder;
		}
		return 0;
	},

	// FLAC__StreamDecoder* init_libflac_decoder(unsigned sample_rate, unsigned channels, unsigned bps, unsigned compression_level, unsigned total_samples);
	init_libflac_decoder: function(sample_rate, channels, bps, compression_level, total_samples, is_verify){
		is_verify = typeof is_verify === 'undefined'? 1 : is_verify + 0;
		var ok = true;
		var decoder = Module.ccall('FLAC__stream_decoder_new', 'number', [ ], [ ]);
		ok &= Module.ccall('FLAC__stream_decoder_set_md5_checking', 'number', ['number', 'number'], [ decoder, is_verify ]);
		if (ok){
			return decoder;
		}
		return 0;
	},

	init_encoder_stream: function(encoder, write_callback_fn, metadata_callback_fn, client_data){
		
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
		
		var init_status = Module.ccall(
				'FLAC__stream_encoder_init_stream', 'number',
				['number', 'number', 'number', 'number', 'number', 'number'],
				[
				 	encoder,
				 	enc_write_fn_ptr,
				 	0,//	FLAC__StreamEncoderSeekCallback 
				 	0,//	FLAC__StreamEncoderTellCallback 
				 	__metadata_callback_fn_ptr,
				 	client_data
				]
		);
		
		return init_status;
	},

	init_decoder_stream: function(decoder, read_callback_fn, write_callback_fn, error_callback_fn, metadata_callback_fn, client_data){

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

		var init_status = Module.ccall(
				'FLAC__stream_decoder_init_stream', 'number',
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

	encode_buffer_pcm_as_flac: function(encoder, buffer, num_of_samples){
		// get the length of the data in bytes
		var numBytes = buffer.length * buffer.BYTES_PER_ELEMENT;
		// console.log("DEBUG numBytes: " + numBytes);
		// malloc enough space for the data
		var ptr = Module._malloc(numBytes);
		// get a bytes-wise view on the newly allocated buffer
		var heapBytes= new Uint8Array(Module.HEAPU8.buffer, ptr, numBytes);
		// console.log("DEBUG heapBytes: " + heapBytes);
		// copy data into heapBytes
		heapBytes.set(new Uint8Array(buffer.buffer));
		var status = Module.ccall('FLAC__stream_encoder_process_interleaved', 'number',
				['number', 'number', 'number'],
				[encoder, heapBytes.byteOffset, num_of_samples]
		);
		Module._free(ptr);
		return status;
	},

	/**
	 * Decodes a single frame.
	 * To check decoding progress, use stream_decoder_get_state().
	 * @returns {Boolean} FALSE if an error occurred
	 */
	decode_buffer_flac_as_pcm: function(decoder){
		//console.log('decode_buffer_flac_as_pcm');
		return Module.ccall('FLAC__stream_decoder_process_single', 'number', ['number'], [decoder]);
	},

	/**
	 * Decodes data until end of stream.
	 * @returns {Boolean} FALSE if an error occurred
	 */
	decode_stream_flac_as_pcm: function(decoder){
		//console.log('decode_stream_flac_as_pcm');
		return Module.ccall('FLAC__stream_decoder_process_until_end_of_stream', 'number', ['number'], [decoder]);
	},
	
	/**
	 * Decodes data until end of stream.
	 * @returns {Boolean} FALSE if an error occurred
	 */
	decode_metadata_flac: function(decoder){
		//console.log('decode_stream_flac_as_pcm');
		return Module.ccall('FLAC__stream_decoder_process_until_end_of_metadata', 'number', ['number'], [decoder]);
	},

	/**
	 * 0	FLAC__STREAM_DECODER_SEARCH_FOR_METADATA:		The decoder is ready to search for metadata
	 * 1	FLAC__STREAM_DECODER_READ_METADATA:				The decoder is ready to or is in the process of reading metadata
	 * 2	FLAC__STREAM_DECODER_SEARCH_FOR_FRAME_SYNC:		The decoder is ready to or is in the process of searching for the frame sync code
	 * 3	FLAC__STREAM_DECODER_READ_FRAME:				The decoder is ready to or is in the process of reading a frame
	 * 4	FLAC__STREAM_DECODER_END_OF_STREAM:				The decoder has reached the end of the stream
	 * 5	FLAC__STREAM_DECODER_OGG_ERROR:					An error occurred in the underlying Ogg layer
	 * 6	FLAC__STREAM_DECODER_SEEK_ERROR:				An error occurred while seeking. The decoder must be flushed with FLAC__stream_decoder_flush() or reset with FLAC__stream_decoder_reset() before decoding can continue
	 * 7	FLAC__STREAM_DECODER_ABORTED:					The decoder was aborted by the read callback
	 * 8	FLAC__STREAM_DECODER_MEMORY_ALLOCATION_ERROR:	An error occurred allocating memory. The decoder is in an invalid state and can no longer be used
	 * 9	FLAC__STREAM_DECODER_UNINITIALIZED:				The decoder is in the uninitialized state; one of the FLAC__stream_decoder_init_*() functions must be called before samples can be processed.
	 */
	FLAC__stream_decoder_get_state: Module.cwrap('FLAC__stream_decoder_get_state', 'number', ['number']),
	
	/**
	 * 0	FLAC__STREAM_ENCODER_OK								The encoder is in the normal OK state and samples can be processed.
	 * 1	FLAC__STREAM_ENCODER_UNINITIALIZED					The encoder is in the uninitialized state; one of the FLAC__stream_encoder_init_*() functions must be called before samples can be processed.
	 * 2	FLAC__STREAM_ENCODER_OGG_ERROR						An error occurred in the underlying Ogg layer.
	 * 3	FLAC__STREAM_ENCODER_VERIFY_DECODER_ERROR			An error occurred in the underlying verify stream decoder; check FLAC__stream_encoder_get_verify_decoder_state().
	 * 4	FLAC__STREAM_ENCODER_VERIFY_MISMATCH_IN_AUDIO_DATA	The verify decoder detected a mismatch between the original audio signal and the decoded audio signal.
	 * 5	FLAC__STREAM_ENCODER_CLIENT_ERROR					One of the callbacks returned a fatal error.
	 * 6	FLAC__STREAM_ENCODER_IO_ERROR						An I/O error occurred while opening/reading/writing a file. Check errno.
	 * 7	FLAC__STREAM_ENCODER_FRAMING_ERROR					An error occurred while writing the stream; usually, the write_callback returned an error.
	 * 8	FLAC__STREAM_ENCODER_MEMORY_ALLOCATION_ERROR		Memory allocation failed. 
	 */
	FLAC__stream_encoder_get_state:  Module.cwrap('FLAC__stream_encoder_get_state', 'number', ['number']),
	
	FLAC__stream_decoder_get_md5_checking: Module.cwrap('FLAC__stream_decoder_get_md5_checking', 'number', ['number']),
	
//	/** @returns {Boolean} FALSE if the decoder is already initialized, else TRUE. */
//	FLAC__stream_decoder_set_md5_checking: Module.cwrap('FLAC__stream_decoder_set_md5_checking', 'number', ['number', 'number']),
	
	FLAC__stream_encoder_init_file: Module.cwrap('FLAC__stream_encoder_init_file', 'number', [ 'number', 'number', 'number', 'number' ]),
	FLAC__stream_encoder_finish: function(encoder){
		var res = Module.ccall('FLAC__stream_encoder_finish', 'number', [ 'number' ], [encoder]);
		this._clear_enc_cb(encoder);
		return res;
	},
	FLAC__stream_decoder_finish: function(decoder){
		var res = Module.ccall('FLAC__stream_decoder_finish', 'number', [ 'number' ], [decoder]);
		this._clear_dec_cb(decoder);
		return res;
	},
	FLAC__stream_decoder_reset: Module.cwrap('FLAC__stream_decoder_reset', 'number', [ 'number' ]),
	FLAC__stream_encoder_delete: function(encoder){
		this._clear_enc_cb(encoder);//<- ensure that the callbacks get removed, even if finish() was not called for the encoder
		return Module.ccall('FLAC__stream_encoder_delete', 'number', [ 'number' ], [encoder]);
	},
	FLAC__stream_decoder_delete: function(decoder){
		this._clear_dec_cb(decoder);//<- ensure that the callbacks get removed, even if finish() was not called for the decoder
		return Module.ccall('FLAC__stream_decoder_delete', 'number', [ 'number' ], [decoder]);
	}

};
})();

if (typeof self !== "undefined" && self !== null){
	self.Flac = Flac; // make Flac accessible to other webworker scripts.
}
