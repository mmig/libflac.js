
function decodeFlac(binData, decData){
	
	var flac_decoder,
	BUFSIZE = 4096,
	CHANNELS = 1,
	SAMPLERATE = 44100,
	COMPRESSION = 5,
	BPS = 16,
	flac_ok = 1,
	current_chunk,
	num_chunks = 0;
	
	
	var TEST_MAX = 100;
	var TEST_COUNT = 0;
	
	var currentDataOffset = 0;
	var size = binData.buffer.byteLength;
	
	function read_callback_fn(bufferSize){
		
	    console.log('decode read callback, buffer bytes max=', bufferSize);
	    
	    //safety check for testing: avoid infinite loop by breaking at max. repeats
	    if(++TEST_COUNT > TEST_MAX){
			return {buffer: null, readDataLength: 0, error: false};
		}
	    
	    //TODO check if is at end of input stream, i.e. nothing to read any more, then:
	//    return {buffer: null, readDataLength: 0, error: false};
	    
	    //current_chunk contains a UInt8Array of the data to be stored
//	    var _buffer = current_chunk.buffer;
//	    var numberOfReadBytes = _buffer.byteLength;
//	    console.log('decode read callback, buffer bytes actual=', numberOfReadBytes);
//	    console.log('decode read callback, current chunk buffer=', current_chunk);
	    
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
	    // TODO buffer is the decoded audio data, UInt32Array or what?
//	    console.log('decode write callback', buffer);
		decData.push(buffer);
	}
	
	function error_callback_fn(decoder, err, client_data){
	    console.log('decode error callback', err);
	    Flac.FLAC__stream_decoder_finish(decoder);
	}
	
	// init decoder
	flac_decoder = Flac.init_libflac_decoder(SAMPLERATE, CHANNELS, BPS, COMPRESSION, 0);
	////
	if (flac_decoder != 0){
	    var status_decoder = Flac.init_decoder_stream(flac_decoder, read_callback_fn, write_callback_fn, error_callback_fn);
	    flac_ok &= (status_decoder == 0);
	    
	    console.log("flac decode init     : " + flac_ok);//DEBUG
	    console.log("status decoder: " + status_decoder);//DEBUG
	    
	    INIT = true;
	} else {
	    console.error("Error initializing the decoder.");
	}
	
	
	// decode a chunk of flac data
	
	// current_chunk will be updated as more data comes in.  For now we'll set it to a sample chunk of FLAC data
//	current_chunk = new Uint8Array([255,248,201,8,0,149,0,0,0,33,189]); // must save it to be used in the callback read function (see read_callback_fn)
	
	flac_return = Flac.decode_stream_flac_as_pcm(flac_decoder);
	if (flac_return != true){
	
	}
	
	
	// finish Decoding
	flac_ok &= Flac.FLAC__stream_decoder_finish(flac_decoder);
	
	return flac_ok;
}