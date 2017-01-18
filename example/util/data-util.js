
/* --- FILE-BUFFER-OPERATIONS --- */

/**
 *  creates one buffer out of an array of arraybuffers
 *  needs the exact amount of bytes used by the array of arraybuffers
 */
function mergeBuffers(channelBuffer, recordingLength){
	var result = new Uint8Array(recordingLength);
	var offset = 0;
	var lng = channelBuffer.length;
	for (var i = 0; i < lng; i++){
		var buffer = channelBuffer[i];
		result.set(buffer, offset);
		offset += buffer.length;
	}
	return result;
}

/**
 *  returns the output data - stored as an array of arraybuffers - as a
 *  single ui8array/arraybuffer.
 */
function exportUI8ArrayBuffer(recBuffers, recLength){
	//get raw-data length:
	var totalBufferSize = recLength;

	//get & reset current buffer content
	var buffers = recBuffers.splice(0, recBuffers.length);

	//convert buffers into one single buffer
	var samples = mergeBuffers( buffers, totalBufferSize);
	
	return samples;
}

/**
 *  creates blob element PCM audio data incl. WAV header
 */
function exportWavFile(recBuffers, sampleRate, channels){
	//get length
	var recLength = getLength(recBuffers);
	//convert buffers into one single buffer
	var samples = exportUI8ArrayBuffer(recBuffers, recLength);
	var dataView = encodeWAV(samples, sampleRate, channels);
	var the_blob = new Blob([dataView], {type: 'audio/wav'});
	return the_blob;
}

/**
 *  creates blob element from libflac-encoder output
 */
function exportFlacFile(recBuffers, metaData){
	var recLength = getLength(recBuffers);
	if(metaData){
		addFLACMetaData(recBuffers, metaData);
	}
	//convert buffers into one single buffer
	var samples = exportUI8ArrayBuffer(recBuffers, recLength);
	var the_blob = new Blob([samples]);
	return the_blob;
}

function getLength(recBuffers){

	//get length
	var recLength = 0;
	//FIXME handle non-mono (i.e. channels > 1) correctly!!!
	for(var i=recBuffers.length - 1; i >= 0; --i){
		recLength += recBuffers[i].byteLength;
	}
	return recLength;
}

/**
 * write PCM data to a WAV file, incl. header
 * 
 * @param samples {Uint8Array} the PCM audio data
 * @param sampleRate {Number} the sample rate for the audio data
 * @param channels {Number} the number of channels that the audio data contains
 * 
 * @returns {DataView} the WAV data incl. header
 */
function encodeWAV(samples, sampleRate, channels){
	
	var buffer = new ArrayBuffer(44 + samples.length);
	var view = new DataView(buffer);

	/* RIFF identifier */
	writeString(view, 0, 'RIFF');
	/* file length */
	view.setUint32(4, 32 + samples.length * 2, true);
	/* RIFF type */
	writeString(view, 8, 'WAVE');
	/* format chunk identifier */
	writeString(view, 12, 'fmt ');
	/* format chunk length */
	view.setUint32(16, 16, true);
	/* sample format (raw) */
	view.setUint16(20, 1, true);
	/* channel count */
	view.setUint16(22, channels, true);
	/* sample rate */
	view.setUint32(24, sampleRate, true);
	/* byte rate (sample rate * block align) */
	view.setUint32(28, sampleRate * channels * 2, true);
	/* block align (channel count * bytes per sample) */
	view.setUint16(32, channels * 2, true);
	/* bits per sample */
	view.setUint16(34, 16, true);
	/* data chunk identifier */
	writeString(view, 36, 'data');
	/* data chunk length */
	view.setUint32(40, samples.length * 2, true);

	writeData(view, 44, samples)

	return view;
}

/**
 * data (missing) meta-data to STREAMINFO meta-data block of the FLAC data
 * 
 * @param chunks {Array<Uint8Array} data chunks of encoded FLAC audio, where the first one is the one produced after encoder was initialized and feed the first/multiple audio frame(s)
 * @param metadata {FlacStreamInfo} the FLAC stream-info (meta-data)
 */
function addFLACMetaData(chunks, metadata){

	var offset = 4;
	var data = chunks[0];//1st data chunk should contain FLAC identifier "fLaC"
	if(data.length < 4 || String.fromCharCode.apply(null, data.subarray(0,4)) != "fLaC"){
		console.error('Unknown data format: cannot add additional FLAC meta data to header');
		return;
	}
	
	//first chunk only contains the flac identifier string?
	if(data.length == 4){
		data = chunks[1];//get 2nd data chunk which should contain STREAMINFO meta-data block (and probably more)
		offset = 0;	
	}
	
	var view = new DataView(data.buffer);
	
	//NOTE by default, the encoder writes a 2nd meta-data block (type VORBIS_COMMENT) with encoder/version info -> do not set "is last" to TRUE for first one
//	// write "is last meta data block" & type STREAMINFO type (0) as little endian combined uint1 & uint7 -> uint8:
//	var isLast = 1;//1 bit
//	var streamInfoType = 0;//7 bit
//	view.setUint8(0 + offset, isLast << 7 | streamInfoType, true);//8 bit

	// block-header: STREAMINFO type, block length -> already set

	// block-content: min_blocksize, min_blocksize -> already set
	
	// write min_framesize as little endian uint24:
	view.setUint8( 8 + offset, metadata.min_framesize >> 16, true);//24 bit
	view.setUint8( 9 + offset, metadata.min_framesize >> 8, true);//24 bit
	view.setUint8(10 + offset, metadata.min_framesize, true);//24 bit
	
	// write max_framesize as little endian uint24:
	view.setUint8(11 + offset, metadata.max_framesize >> 16, true);//24 bit
	view.setUint8(12 + offset, metadata.max_framesize >> 8, true);//24 bit
	view.setUint8(13 + offset, metadata.max_framesize, true);//24 bit

	// block-content: sampleRate, channels, bitsPerSample -> already set
	
	// write total_samples as little endian uint36:
	//TODO set last 4 bits to half of the value in index 17
	view.setUint8(18 + offset, metadata.total_samples >> 24, true);//36 bit
	view.setUint8(19 + offset, metadata.total_samples >> 16, true);//36 bit
	view.setUint8(20 + offset, metadata.total_samples >> 8, true);//36 bit
	view.setUint8(21, metadata.total_samples, true);//36 bit

	writeMd5(view, 22 + offset, metadata.md5sum);//16 * 8 bit
}

/**
 * 
 * @param view {DataView}
 * 				the buffer into which the MD5 checksum will be written
 * @param offset {Number}
 * 				the byte offset in the buffer, at which the checksum will be written
 * @param str {String} the MD5 checksum as HEX formatted string with length 32 (i.e. each HEX number has length 2)
 */
function writeMd5(view, offset, str) {
	var index;
	for(var i = 0; i < str.length/2; ++i) {
		index =  i * 2;
		view.setUint8(i + offset, parseInt(str.substring(index, index + 2), 16));
	}
}

function writeString(view, offset, string) {
	for (var i = 0; i < string.length; i++) {
		view.setUint8(offset + i, string.charCodeAt(i));
	}
}

function writeData(output, offset, input){
	for (var i = 0; i < input.length; ++i, ++offset){
		output.setUint8(offset, input[i], true);
	}
}


/**
 *  checks if the given ui8_data (ui8array) is of a wav-file
 */
function wav_file_processing_check_wav_format(ui8_data){
	// check: is file a compatible wav-file?
	if ((ui8_data.length < 44) ||
		(String.fromCharCode.apply(null, ui8_data.subarray(0,4)) != "RIFF") ||
		(String.fromCharCode.apply(null, ui8_data.subarray(8, 16)) != "WAVEfmt ") ||
		(String.fromCharCode.apply(null, ui8_data.subarray(36, 40)) != "data"))
	{
		console.log("ERROR: wrong format for wav-file.");
		return false;
	}
	return true;
}

/**
 *  checks if the given ui8_data (ui8array) is of a flac-file
 */
function wav_file_processing_check_flac_format(ui8_data){
	
	// check: is file a compatible flac-file?
	if ((ui8_data.length < 42) ||
		(String.fromCharCode.apply(null, ui8_data.subarray(0,4)) != "fLaC")
	){
		console.log("ERROR: wrong format for flac-file.");
		return false;
	}
	
	var view = new DataView(ui8_data.buffer);
	//check last 7 bits of 4th byte for meta-data BLOCK type: must be STREAMINFO (0)
	if ((view.getUint8(4) & 0x7f) != 0){
		console.log("ERROR: wrong format for flac-file.");
		return false;	
	}
	
	return true;
}

/**
 *  reads the paramaters of a wav-file - stored in a ui8array
 */
function wav_file_processing_read_parameters(ui8_data){
	var sample_rate=0,
		channels=0,
		bps=0,
		total_samples=0,
		block_align;

	// get WAV/PCM parameters from data / file
	sample_rate = (((((ui8_data[27] << 8) | ui8_data[26]) << 8) | ui8_data[25]) << 8) | ui8_data[24];
	channels = ui8_data[22];
	bps = ui8_data[34];
	block_align = ui8_data[32];
	total_samples = ((((((ui8_data[43] << 8) | ui8_data[42]) << 8) | ui8_data[41]) << 8) | ui8_data[40]) / block_align;
	
	return {
		sample_rate: sample_rate,
		channels: channels,
		bps: bps,
		total_samples: total_samples,
		block_align: block_align
	}
}

/**
 *  converts the PCM data of the wav file (each sample stored as 16 bit value) into 
 *  a format expected by the libflac-encoder method (each sample stored as 32 bit value in a 32-bit array)
 */
function wav_file_processing_convert_16bitdata_to32bitdata(arraybuffer){
	// convert the PCM-Data to the appropriate format for the libflac library methods (32-bit array of samples)
	// creates a new array (32-bit) and stores the 16-bit data of the wav-file as 32-bit data
	var ab_i16 = new DataView(arraybuffer, 44);
	var buf_length = ab_i16.byteLength;
	var buf32_length = buf_length / 2;
	var buffer_i32 = new Uint32Array(buf32_length);
	var view = new DataView(buffer_i32.buffer);
	var index = 0;
	for (var j = 0; j < buf_length; j+=2){
		view.setInt32(index, (ab_i16.getInt16(j, true)), true);
		index += 4;
	}
	return buffer_i32;
}

/**
 *  create A-element for data BLOB and trigger download
 */
function forceDownload(blob, filename){
	var url = (window.URL || window.webkitURL).createObjectURL(blob);
	var link = window.document.createElement('a');
	link.href = url;
	link.download = filename || 'output.flac';
	//NOTE: FireFox requires a MouseEvent (in Chrome a simple Event would do the trick)
	var click = document.createEvent("MouseEvent");
	click.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
	link.dispatchEvent(click);
}
