//libflac function wrappers

var READSIZE = 4096;


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

return {
	_module: Module,
	_enc_cb: {},
	_dec_cb: {},
	_rm_cb: function(list){
		for(var i=0, size = list.length; i < size; ++i){
			Runtime.removeFunction(list[i]);
		}
	},
	_clear_enc_cb: function(enc_ptr){
		var list = this._enc_cb[enc_ptr];
		if(list){
			this._rm_cb(list);
			this._enc_cb[enc_ptr] = void(0);
		}
	},
	_clear_dec_cb: function(dec_ptr){
		var list = this._dec_cb[dec_ptr];
		if(list){
			this._rm_cb(list);
			this._dec_cb[dec_ptr] = void(0);
		}
	},
	FLAC__stream_encoder_set_verify: Module.cwrap('FLAC__stream_encoder_set_verify', 'number', [ 'number' ]),
	FLAC__stream_encoder_set_compression_level: Module.cwrap('FLAC__stream_encoder_set_compression_level', 'number', [ 'number', 'number' ]),
	/* ... */

	// FLAC__StreamEncoder* init_libflac(unsigned sample_rate, unsigned channels, unsigned bps, unsigned compression_level, unsigned total_samples);
	init_libflac: function(sample_rate, channels, bps, compression_level, total_samples){
		var ok = true;
		var encoder = Module.ccall('FLAC__stream_encoder_new', 'number', [ ], [ ]);
		ok &= Module.ccall('FLAC__stream_encoder_set_verify', 'number', ['number', 'number'], [ encoder, true ]);
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
	init_libflac_decoder: function(sample_rate, channels, bps, compression_level, total_samples){
		var ok = true;
		var decoder = Module.ccall('FLAC__stream_decoder_new', 'number', [ ], [ ]);
		if (ok){
			return decoder;
		}
		return 0;
	},

	init_encoder_stream: function(encoder, write_callback_fn, metadata_callback_fn, client_data){
		
		client_data = client_data|0;
		
		var callback_fn_ptr = Runtime.addFunction(function(p_encoder, buffer, bytes, samples, current_frame, p_client_data){
			var arraybuf = new ArrayBuffer(buffer);
			var retdata = new Uint8Array(bytes);
			retdata.set(HEAPU8.subarray(buffer, buffer + bytes));
			// write_callback_fn(retdata, bytes, p_client_data);
			write_callback_fn(retdata, bytes, samples, current_frame, p_client_data);
		});
		
		var metadata_callback_fn_ptr = !metadata_callback_fn? 0 : Runtime.addFunction(function(p_decoder, p_metadata, p_client_data){

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

			var meta_data;
			//TODO handle other meta data too
			if(type === 0){//FLAC__METADATA_TYPE_STREAMINFO
				meta_data = _readStreamInfo(p_metadata+16);//10);

				metadata_callback_fn(meta_data);
			}
		});

		//store created callback pointers (for clean-up in finish()/delete())
		//NOTE the number of callbacks that can be registered is limited
		//     as a result, this limits the number of encoder/decoder instances that can run at the same time
		//     the limit is set by the compile-option
		//       -s RESERVED_FUNCTION_POINTERS=<n>
		//     currently this is set to 20 (each encoder requires 1-2 slots, each decoder requires 3-4 slots)
		this._enc_cb[encoder] = [callback_fn_ptr];
		if(metadata_callback_fn) this._enc_cb[encoder].push(metadata_callback_fn_ptr);
		
		var init_status = Module.ccall(
				'FLAC__stream_encoder_init_stream', 'number',
				['number', 'number', 'number', 'number', 'number', 'number'],
				[
				 	encoder,
				 	callback_fn_ptr,
				 	0,//	FLAC__StreamEncoderSeekCallback 
				 	0,//	FLAC__StreamEncoderTellCallback 
				 	metadata_callback_fn_ptr,
				 	client_data
				]
		);
		// FLAC__STREAM_ENCODER_INIT_STATUS_OK = 0
		// if( init_status != 0){
		// return false;
		// }
		// return true;
		return init_status;
	},

	init_decoder_stream: function(decoder, read_callback_fn, write_callback_fn, error_callback_fn, metadata_callback_fn, client_data){

		client_data = client_data|0;

		//TODO move these out of this function / public export?
		// FLAC__STREAM_DECODER_READ_STATUS_CONTINUE     The read was OK and decoding can continue.
		// FLAC__STREAM_DECODER_READ_STATUS_END_OF_STREAM   The read was attempted while at the end of the stream. Note that the client must only return this value when the read callback was called when already at the end of the stream. Otherwise, if the read itself moves to the end of the stream, the client should still return the data and FLAC__STREAM_DECODER_READ_STATUS_CONTINUE, and then on the next read callback it should return FLAC__STREAM_DECODER_READ_STATUS_END_OF_STREAM with a byte count of 0.
		// FLAC__STREAM_DECODER_READ_STATUS_ABORT       An unrecoverable error occurred. The decoder will return from the process call.
		var FLAC__STREAM_DECODER_READ_STATUS_CONTINUE = 0;
		var FLAC__STREAM_DECODER_READ_STATUS_END_OF_STREAM = 1;
		var FLAC__STREAM_DECODER_READ_STATUS_ABORT = 2;


		// FLAC__STREAM_DECODER_WRITE_STATUS_CONTINUE   The write was OK and decoding can continue.
		// FLAC__STREAM_DECODER_WRITE_STATUS_ABORT     An unrecoverable error occurred. The decoder will return from the process call.
		var FLAC__STREAM_DECODER_WRITE_STATUS_CONTINUE = 0;
		var FLAC__STREAM_DECODER_WRITE_STATUS_ABORT = 1;


		/**
		 * HELPER workaround / fix for returned write-buffer for decoding FLAC    	 * 
		 * @param buffer {Uint8Array}
		 * @returns {Uint8Array}
		 */
		var __fix_write_buffer = function(buffer){
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
		};

		//(const FLAC__StreamDecoder *decoder, FLAC__byte buffer[], size_t *bytes, void *client_data)
		var read_callback_fn_ptr = Runtime.addFunction(function(p_decoder, buffer, bytes, p_client_data){
			//FLAC__StreamDecoderReadCallback, see https://xiph.org/flac/api/group__flac__stream__decoder.html#ga7a5f593b9bc2d163884348b48c4285fd

			var len = Module.getValue(bytes, 'i32');

			if(len === 0){
				return FLAC__STREAM_DECODER_READ_STATUS_ABORT;
			}

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

		var error_callback_fn_ptr = Runtime.addFunction(function(p_decoder, err, p_client_data){

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
				msg = 'FLAC__STREAM_DECODER_ERROR__UNKNOWN';//this should never happen
			}

			//TODO convert err? add/remove string representation for err code?
			error_callback_fn(err, msg, p_client_data);
		});

		//(const FLAC__StreamDecoder *decoder, const FLAC__StreamMetadata *metadata, void *client_data)
		var metadata_callback_fn_ptr = !metadata_callback_fn? 0 : Runtime.addFunction(function(p_decoder, p_metadata, p_client_data){

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
			var is_last = Module.getValue(p_metadata+4,'i16');//2 bytes
			var length = Module.getValue(p_metadata+6,'i32');//4 bytes

			var meta_data;
			//TODO handle other meta data too
			if(type === 0){//FLAC__METADATA_TYPE_STREAMINFO
				meta_data = _readStreamInfo(p_metadata+16);//10);

				metadata_callback_fn(meta_data);
			}
		});

		//(const FLAC__StreamDecoder *decoder, const FLAC__Frame *frame, const FLAC__int32 *const buffer[], void *client_data)
		var write_callback_fn_ptr = Runtime.addFunction(function(p_decoder, p_frame, p_buffer, p_client_data){

			// var dec = Module.getValue(p_decoder,'i32');
			// var clientData = Module.getValue(p_client_data,'i32');

			var buffer = Module.getValue(p_buffer,'i32');

			var frameInfo = _readFrameHdr(p_frame);

			console.log(frameInfo);//DEBUG

			var block_size = frameInfo.blocksize * (frameInfo.bitsPerSample / 8);

			var increase = 2;//FIXME (see below fix_write_buffer)

			//FIXME this works for mono / single channel only...
			var heapView = HEAPU8.subarray(buffer, buffer + block_size * increase);
			//var _buffer = new Uint8Array(heapView);

			//FIXME
			var _buffer = __fix_write_buffer(heapView);
			if(_buffer.length < block_size){
				while(_buffer.length < block_size && buffer + block_size * increase < HEAPU8.length){
					increase += 2;
					heapView = HEAPU8.subarray(buffer, buffer + block_size * increase);
					_buffer = __fix_write_buffer(heapView);
				}
			}

			write_callback_fn(_buffer.subarray(0, block_size), frameInfo);//, clientData);

			// FLAC__STREAM_DECODER_WRITE_STATUS_CONTINUE	The write was OK and decoding can continue.
			// FLAC__STREAM_DECODER_WRITE_STATUS_ABORT     	An unrecoverable error occurred. The decoder will return from the process call.

			return FLAC__STREAM_DECODER_WRITE_STATUS_CONTINUE;
		});

		//store created callback pointers (for clean-up in finish()/delete())
		//NOTE the number of callbacks that can be registered is limited
		//     as a result, this limits the number of encoder/decoder instances that can run at the same time
		//     the limit is set by the compile-option
		//       -s RESERVED_FUNCTION_POINTERS=<n>
		//     currently this is set to 20 (each encoder requires 1-2 slots, each decoder requires 3-4 slots)
		//     (the slots are freed up, when an encoder/decoder is finished() or deleted())
		this._dec_cb[decoder] = [read_callback_fn_ptr, error_callback_fn_ptr, write_callback_fn_ptr];
		if(metadata_callback_fn) this._dec_cb[decoder].push(metadata_callback_fn_ptr);

		var init_status = Module.ccall(
				'FLAC__stream_decoder_init_stream', 'number',
				[ 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number', 'number'],
				[
                   decoder,
                   read_callback_fn_ptr, 
                   0,// FLAC__StreamDecoderSeekCallback
                   0,// FLAC__StreamDecoderTellCallback
                   0,//	FLAC__StreamDecoderLengthCallback
                   0,//	FLAC__StreamDecoderEofCallback
                   write_callback_fn_ptr,
                   metadata_callback_fn_ptr,
                   error_callback_fn_ptr,
                   client_data
                ]
		);

		return init_status;
	},

	encode_buffer_pcm_as_flac: function(encoder, buffer, channels, no_items){
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
		// return Module.ccall('FLAC__stream_encoder_process_interleaved', 'number', ['number', 'number', 'number'], [encoder, heapBytes.byteOffset, buffer.length]);
		return Module.ccall('FLAC__stream_encoder_process_interleaved', 'number', ['number', 'number', 'number'], [encoder, heapBytes.byteOffset, no_items]);
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
	stream_decoder_get_state: function(decoder){
		return Module.ccall('FLAC__stream_decoder_get_state', 'number', ['number'], [decoder]);
	},

	/**
	 * Decodes data until end of stream.
	 * @returns {Boolean} FALSE if an error occurred
	 */
	decode_stream_flac_as_pcm: function(decoder){
		//console.log('decode_stream_flac_as_pcm');
		return Module.ccall('FLAC__stream_decoder_process_until_end_of_stream', 'number', ['number'], [decoder]);
	},

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
