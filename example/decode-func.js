
function decodeFlac(binData, decData, isVerify){
	
	var flac_decoder,
		VERIFY = true,
		flac_ok = 1,
		meta_data;
	
	var currentDataOffset = 0;
	var size = binData.buffer.byteLength;
	
	VERIFY = isVerify || false;
	
	/** @memberOf decode */
	function read_callback_fn(bufferSize){
		
	    console.log('decode read callback, buffer bytes max=', bufferSize);
	    
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
	
	/** @memberOf decode */
	function write_callback_fn(buffer){
	    // buffer is the decoded audio data, Uint8Array
//	    console.log('decode write callback', buffer);
		decData.push(buffer);
	}
	
	/** @memberOf decode */
	function metadata_callback_fn(data){
		console.info('meta data: ', data);
		meta_data = data;
	}
	
	/** @memberOf decode */
	function error_callback_fn(decoder, err, client_data){
	    console.log('decode error callback', err);
	}
	
	// check: is file a compatible flac-file?
	if (flac_file_processing_check_flac_format(binData) == false){
		return {error: 'Wrong FLAC file format', status: 1};
	}
	
	// init decoder
	flac_decoder = Flac.create_libflac_decoder(VERIFY);

	if (flac_decoder != 0){
		var init_status = Flac.init_decoder_stream(flac_decoder, read_callback_fn, write_callback_fn, error_callback_fn, metadata_callback_fn);
		flac_ok &= init_status == 0;
	    console.log("flac init     : " + flac_ok);//DEBUG
	} else {
		var msg = 'Error initializing the decoder.';
	    console.error(msg);
		return {error: msg, status: 1};
	}
	
	// decode flac data
	
	var isDecodePartial = true;
	var flac_return = 1;
	if(!isDecodePartial){
		//variant 1: decode stream at once / completely
		
		flac_return &= Flac.FLAC__stream_decoder_process_until_end_of_stream(flac_decoder);
		if (flac_return != true){
			console.error('encountered error during decoding data');
		}
		
	} else {
		//variant 2: decode data chunks
		
		//request to decode data chunks until end-of-stream is reached:
		var state = 0;
		while(state <= 3 && flac_return != false){
		    
			flac_return &= Flac.FLAC__stream_decoder_process_single(flac_decoder);
			//need to check decoder state: state == 4: end of stream ( > 4: error)
			state = Flac.FLAC__stream_decoder_get_state(flac_decoder);
		}
		
		flac_ok &= flac_return != false
	}
	
	// finish Decoding
	flac_ok &= Flac.FLAC__stream_decoder_finish(flac_decoder);
	if(flac_ok != 1){
		//TODO get/return description for state
		flac_ok = Flac.FLAC__stream_decoder_get_state(flac_decoder);
	}
	
	Flac.FLAC__stream_decoder_delete(flac_decoder);
	
	return {metaData: meta_data, status: flac_ok};
}
