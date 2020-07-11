
function encodeFlac(binData, recBuffers, isVerify, isUseOgg){

	var ui8_data = new Uint8Array(binData);
	var sample_rate=0,
		channels=0,
		bps=0,
		total_samples=0,
		block_align,
		position=0,
		recLength = 0,
		meta_data;

	/**
	 *  records/saves the output data of libflac-encode method
	 */
	function write_callback_fn(buffer, bytes, samples, current_frame){
		recBuffers.push(buffer);
		recLength += bytes;
		// recLength += buffer.byteLength;
	}

	function metadata_callback_fn(data){
		console.info('meta data: ', data);
		meta_data = data;
	}

	// check: is file a compatible wav-file?
	if (wav_file_processing_check_wav_format(ui8_data) == false){
		return {error: 'Wrong WAV file format', status: 0};
	}

	// get WAV/PCM parameters from data / file
	var wav_parameters = wav_file_processing_read_parameters(ui8_data);

	console.log("sample_rate  : " + wav_parameters.sample_rate);
	console.log("channels     : " + wav_parameters.channels);
	console.log("bps          : " + wav_parameters.bps);
	console.log("block_align  : " + wav_parameters.block_align);
	console.log("total_samples: " + wav_parameters.total_samples);

	// convert the PCM-Data to the appropriate format for the libflac library methods (32-bit array of samples)
	// creates a new array (32-bit) and stores the 16-bit data of the wav-file as 32-bit data
	var buffer_i32 = wav_file_processing_convert_to32bitdata(ui8_data.buffer, wav_parameters.bps, wav_parameters.block_align);

	if(!buffer_i32){
		var msg = 'Unsupported WAV format';
		console.error(msg);
		return {error: msg, status: 1};
	}

	var tot_samples = 0;
	var compression_level = 5;
	var flac_ok = 1;
	var is_verify = isVerify;
	var is_write_ogg = isUseOgg;

	var flac_encoder = Flac.create_libflac_encoder(wav_parameters.sample_rate, wav_parameters.channels, wav_parameters.bps, compression_level, tot_samples, is_verify);
	if (flac_encoder != 0){
		var init_status = Flac.init_encoder_stream(flac_encoder, write_callback_fn, metadata_callback_fn, is_write_ogg, 0);
		flac_ok &= init_status == 0;
		console.log("flac init: " + flac_ok);
	} else {
		Flac.FLAC__stream_encoder_delete(flac_encoder);
		var msg = 'Error initializing the decoder.';
		console.error(msg);
		return {error: msg, status: 1};
	}


	var isEndocdeInterleaved = true;
	var flac_return;
	if(isEndocdeInterleaved){

		//variant 1: encode interleaved channels: TypedArray -> [ch1_sample1, ch2_sample1, ch1_sample1, ch2_sample2, ch2_sample3, ...

		flac_return = Flac.FLAC__stream_encoder_process_interleaved(flac_encoder, buffer_i32, buffer_i32.length / wav_parameters.channels);

	} else {

		//variant 2: encode channels array: TypedArray[] -> [ [ch1_sample1, ch1_sample2, ch1_sample3, ...], [ch2_sample1, ch2_sample2, ch2_sample3, ...], ...]

		var ch = wav_parameters.channels;
		var len = buffer_i32.length;
		var channels = new Array(ch).fill(null).map(function(){ return new Uint32Array(len/ch)});
		for(var i=0; i < len; i+=ch){
			for(var j=0; j < ch; ++j){
				channels[j][i/ch] = buffer_i32[i+j];
			}
		}

		flac_return = Flac.FLAC__stream_encoder_process(flac_encoder, channels, buffer_i32.length / wav_parameters.channels);
	}

	if (flac_return != true){
		console.error("Error: FLAC__stream_encoder_process_interleaved returned false. " + flac_return);
		flac_ok = Flac.FLAC__stream_encoder_get_state(flac_encoder);
		Flac.FLAC__stream_encoder_delete(flac_encoder);
		return {error: 'Encountered error while encoding.', status: flac_ok};
	}

	flac_ok &= Flac.FLAC__stream_encoder_finish(flac_encoder);

	Flac.FLAC__stream_encoder_delete(flac_encoder);

	return {metaData: meta_data, status: flac_ok};
}
