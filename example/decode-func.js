
function decodeFlac(binData, decData){
	
	var flac_decoder,
		BUFSIZE = 4096,
		CHANNELS = 1,
		SAMPLERATE = 44100,
		COMPRESSION = 5,
		BPS = 16,
		flac_ok = 1,
		current_chunk,
		num_chunks = 0,
		meta_data;
	
	
	var TEST_MAX = 100;//FIXME TEST: for safety check for testing -> avoid infinite loop by breaking at max. repeats
	var TEST_COUNT = 0;//FIXME TEST
	
	var currentDataOffset = 0;
	var size = binData.buffer.byteLength;
	
	function read_callback_fn(bufferSize){
		
	    console.log('decode read callback, buffer bytes max=', bufferSize);
	    
	    //safety check for testing: avoid infinite loop by breaking at max. repeats
	    if(++TEST_COUNT > TEST_MAX){
			return {buffer: null, readDataLength: 0, error: false};
		}
	    
	    var start = currentDataOffset;
	    var end = currentDataOffset === size? -1 : Math.min(currentDataOffset + bufferSize, size);
	    
	    var _buffer;
	    var numberOfReadBytes;
	    if(end !== -1){
	    	
	    	_buffer = binData.subarray(currentDataOffset, end);
	    	numberOfReadBytes = end - currentDataOffset;
	    	
	    	currentDataOffset = end;
	    } else {
	    	numberOfReadBytes = 0;
	    }
	
	    return {buffer: _buffer, readDataLength: numberOfReadBytes, error: false};
	}
	
	function write_callback_fn(buffer){
	    // TODO buffer is the decoded audio data, Uint8Array
//	    console.log('decode write callback', buffer);
		decData.push(buffer);
	}
	
	function metadata_callback_fn(data){
		console.info('meta data: ', data);
		
		meta_data = data;
	}
	
	function error_callback_fn(decoder, err, client_data){
	    console.log('decode error callback', err);
	    Flac.FLAC__stream_decoder_finish(decoder);
	}
	
	// init decoder
	flac_decoder = Flac.init_libflac_decoder(SAMPLERATE, CHANNELS, BPS, COMPRESSION, 0);
	////
	if (flac_decoder != 0){
	    var status_decoder = Flac.init_decoder_stream(flac_decoder, read_callback_fn, write_callback_fn, error_callback_fn, metadata_callback_fn);
	    flac_ok &= (status_decoder == 0);
	    
	    console.log("flac decode init     : " + flac_ok);//DEBUG
	    console.log("status decoder: " + status_decoder);//DEBUG
	    
	    INIT = true;
	} else {
	    console.error("Error initializing the decoder.");
	}
	
	
	// decode a chunk of flac data
	
	var isDecodePartial = true;
	if(!isDecodePartial){
		//variant 1: decode stream at once / completely
		
		flac_return = Flac.decode_stream_flac_as_pcm(flac_decoder);
		if (flac_return != true){
			console.error('encountered error during decoding data');
		}
		
	} else {
		//variant 2: decode data chunks
		
		flac_return = Flac.decode_buffer_flac_as_pcm(flac_decoder);
		//need to check decoder state: state == 4: end of stream ( > 4: error)
		var state = Flac.stream_decoder_get_state(flac_decoder);
		
		//request to decode data chunks until end-of-stream is reached:
		while(state <= 3 && flac_return != false){
			
			//safety check for testing: avoid infinite loop by breaking at max. repeats
		    if(++TEST_COUNT > TEST_MAX){
		    	console.error('reached safetly limit for loop!');
				break;
			}
		    
			flac_return = Flac.decode_buffer_flac_as_pcm(flac_decoder);
			state = Flac.stream_decoder_get_state(flac_decoder);
		}
	}
	
	
	// finish Decoding
	flac_ok &= Flac.FLAC__stream_decoder_finish(flac_decoder);
	
	return {metaData: meta_data, status: flac_ok};
}