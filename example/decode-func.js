
function decodeFlac(binData, decData){
	
	var flac_decoder,
		BUFSIZE = 4096,
		CHANNELS = 1,
		SAMPLERATE = 44100,
		COMPRESSION = 5,
		BPS = 16,
		VERIFY = true,
		flac_ok = 1,
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
	    // buffer is the decoded audio data, Uint8Array
//	    console.log('decode write callback', buffer);
		decData.push(buffer);
	}
	
	function metadata_callback_fn(data){
		console.info('meta data: ', data);
		meta_data = data;
	}
	
	function error_callback_fn(decoder, err, client_data){
	    console.log('decode error callback', err);
	}
	
	// check: is file a compatible flac-file?
	if (flac_file_processing_check_flac_format(binData) == false){
		return {error: 'Wrong FLAC file format', status: 1};
	}

	console.log('before INIT -> available callback slots: ', Flac.getFreeCallbackSlots());
	
	// init decoder
	flac_decoder = Flac.init_libflac_decoder(SAMPLERATE, CHANNELS, BPS, COMPRESSION, 0, VERIFY);

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
		
		flac_return &= Flac.decode_stream_flac_as_pcm(flac_decoder);
		if (flac_return != true){
			console.error('encountered error during decoding data');
		}
		
	} else {
		//variant 2: decode data chunks
		
		flac_return &= Flac.decode_buffer_flac_as_pcm(flac_decoder);
		//need to check decoder state: state == 4: end of stream ( > 4: error)
		var state = Flac.FLAC__stream_decoder_get_state(flac_decoder);
		
		//request to decode data chunks until end-of-stream is reached:
		while(state <= 3 && flac_return != false){
			
			//safety check for testing: avoid infinite loop by breaking at max. repeats
		    if(++TEST_COUNT > TEST_MAX){
		    	console.error('reached safetly limit for loop!');
				break;
			}
		    
			flac_return &= Flac.decode_buffer_flac_as_pcm(flac_decoder);
			state = Flac.FLAC__stream_decoder_get_state(flac_decoder);
		}
		
		flac_ok &= flac_return != false
	}

	console.log('before FINISH -> available callback slots: ', Flac.getFreeCallbackSlots());
	
	// finish Decoding
	flac_ok &= Flac.FLAC__stream_decoder_finish(flac_decoder);
	if(flac_ok != 1){
		//TODO get/return description for state
		flac_ok = Flac.FLAC__stream_decoder_get_state(flac_decoder);
	}
	
	Flac.FLAC__stream_decoder_delete(flac_decoder);
	
	console.log('after FINISH -> available callback slots: ', Flac.getFreeCallbackSlots());
	
	return {metaData: meta_data, status: flac_ok};
}

function testCallbackLimit(){
	
	var BUFSIZE = 4096,
		CHANNELS = 1,
		SAMPLERATE = 44100,
		COMPRESSION = 5,
		BPS = 16,
		VERIFY = true;
	
	var TEST_SIZE = 50;
	var decs = [];
	
	var read_callback_fn = function(){};
	var write_callback_fn = function(){};
	var error_callback_fn = function(){};
	var metadata_callback_fn = function(){};

	console.log('before TEST -> available callback slots: ', Flac.getFreeCallbackSlots());
	
	for(var j=0; j < TEST_SIZE; ++j){
		console.log('before TEST INIT('+(j+1)+') -> available callback slots: ', Flac.getFreeCallbackSlots());
		var test_flac_decoder = Flac.init_libflac_decoder(SAMPLERATE, CHANNELS, BPS, COMPRESSION, 0, VERIFY);
		if (test_flac_decoder != 0){
			decs.push(test_flac_decoder);
			try{
				Flac.init_decoder_stream(test_flac_decoder, read_callback_fn, write_callback_fn, error_callback_fn, metadata_callback_fn);
				console.log('after TEST INIT('+(j+1)+') -> available callback slots: ', Flac.getFreeCallbackSlots());
			} catch(err){
				console.info('ERROR on TEST INIT('+(j+1)+') -> failed to init decoder, free callback slots: ', Flac.getFreeCallbackSlots(), ', error: ', err);
				break;
			}
		} else {
			console.error('FAILURE during TEST INIT('+(j+1)+') -> failed to create decoder, free callback slots: ', Flac.getFreeCallbackSlots());
		}
	}
	
	console.info('RESULT: created '+(j+1)+' active decoder instances, before callback-limit was reached.');
	
	//clean up,
	for(var j=0, size = decs.length; j < size; ++j){
		Flac.FLAC__stream_decoder_delete(decs[j]);
	}
	console.log('after TEST -> available callback slots: ', Flac.getFreeCallbackSlots());
}