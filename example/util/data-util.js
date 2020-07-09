
/* --- FILE-BUFFER-OPERATIONS --- */

/**
 *  creates one buffer out of an array of arraybuffers
 *  needs the exact amount of bytes used by the array of arraybuffers
 *
 *  @param channelBuffer {Array<Uint8Array>}
 *  @param recordingLength {Number} byte-length for target/returned Uint8Array
 *  @returns {Uint8Array} the concatenated data for the list of buffered Uint8Array data
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
 *
 * @param recBuffers {Array<Array<Uint8Array>>}
 * 			the array of buffered audio data, where each entry contains an array for the channels, i.e.
 * 			recBuffers[0]: [channel_1_data, channel_2_data, ..., channel_n_data]
 * 			recBuffers[1]: [channel_1_data, channel_2_data, ..., channel_n_data]
 * 			...
 * 			recBuffers[length-1]: [channel_1_data, channel_2_data, ..., channel_n_data]
 *
 * @param channels {Number} count of channels
 * @param bitsPerSample {Number} bits per sample, i.e.: bitsPerSample/8 == bytes-per-sample
 * @returns {Uint8Array} audio data where channels are interleaved
 */
function interleave(recBuffers, channels, bitsPerSample){

	var byteLen = bitsPerSample / 8;

	//NOTE 24-bit samples are padded with 1 byte
	var pad8 = (bitsPerSample === 24 || bitsPerSample === 8)? 1 : 0;
	if(pad8){
		byteLen += pad8;
	}

	//calculate total length for interleaved data
	var dataLength = 0;
	for(var i=0; i < channels; ++i){
		dataLength += getLengthFor(recBuffers, i, byteLen, pad8);
	}

	var result = new Uint8Array(dataLength);

	var buff = null,
		buffLen = 0,
		index = 0,
		inputIndex = 0,
		ch_i = 0,
		b_i = 0,
		pad_i = false,
		ord = false;

	for(var arrNum = 0, arrCount = recBuffers.length; arrNum < arrCount; ++arrNum){

		//for each buffer (i.e. array of Uint8Arrays):
		buff = recBuffers[arrNum];
		buffLen = buff[0].length;
		inputIndex = 0;
		pad_i = false;
		ord = false;

		//interate over buffer
		while(inputIndex < buffLen){

			//write channel data
			for(ch_i=0; ch_i < channels; ++ch_i){
				//write sample-length
				for(b_i=0; b_i < byteLen; ++b_i){
					// write data & update target-index
					if(pad8) {
						pad_i = pad8 && (b_i === byteLen - pad8);
						if(pad_i){
							if(buff[ch_i][inputIndex + b_i] !== 0 && buff[ch_i][inputIndex + b_i] !== 255){
								console.error('[ERROR] mis-aligned padding: ignoring non-padding value (padding should be 0 or 255) at '+(inputIndex + b_i)+' -> ', buff[ch_i][inputIndex + b_i]);
							}
						} else {
							if(bitsPerSample === 8){
								ord = buff[ch_i][inputIndex + b_i + 1] === 0;
								result[index++] = ord? buff[ch_i][inputIndex + b_i] | 128 : buff[ch_i][inputIndex + b_i] & 127;
							} else {
								result[index++] = buff[ch_i][inputIndex + b_i];
							}

						}
					} else {
						result[index++] = buff[ch_i][inputIndex + b_i];
					}
				}
			}
			//update source-index
			inputIndex+=byteLen;
		}
	}
	return result;
}

/**
 * creates blob element PCM audio data incl. WAV header
 *
 * @param recBuffers {Array<Array<Uint8Array>>}
 * 			the array of buffered audio data, where each entry contains an array for the channels, i.e.
 * 			recBuffers[0]: [channel_1_data, channel_2_data, ..., channel_n_data]
 * 			recBuffers[1]: [channel_1_data, channel_2_data, ..., channel_n_data]
 * 			...
 * 			recBuffers[length-1]: [channel_1_data, channel_2_data, ..., channel_n_data]
 *
 * @returns {Blob} blob with MIME type audio/wav
 */
function exportWavFile(recBuffers, sampleRate, channels, bitsPerSample){

	//convert buffers into one single buffer
	var samples = interleave(recBuffers, channels, bitsPerSample);
	var dataView = encodeWAV(samples, sampleRate, channels, bitsPerSample);
	var the_blob = new Blob([dataView], {type: 'audio/wav'});
	return the_blob;
}

/**
 *  creates blob element from libflac-encoder output
 */
function exportFlacFile(recBuffers, metaData, isOgg){
	var recLength = getLength(recBuffers);
	if(metaData){
		addFLACMetaData(recBuffers, metaData, isOgg);
	}
	//convert buffers into one single buffer
	var samples = mergeBuffers(recBuffers, recLength);
	var the_blob = new Blob([samples], {type: isOgg? 'audio/ogg' : 'audio/flac'});
	return the_blob;
}

/**
 *
 * @param recBuffers {Array<TypedArray>}
 * @returns {Number}
 * 			the byte-length
 */
function getLength(recBuffers){

	//get length
	var recLength = 0;
	for(var i=recBuffers.length - 1; i >= 0; --i){
		recLength += recBuffers[i].byteLength;
	}
	return recLength;
}

/**
 *
 * @param recBuffers {Array<Array<TypedArray>>}
 * @param index {Number}
 * 			selects the Array<TypedArray> within the outer Array, for which the byte-length should be calculated
 * @param [sampleBytes] {Number} number of bytes per sample (required if bytePadding is specified)
 * @param [bytePadding] {Number} number of padding bytes per sample that will get removed from the raw data (i.e. returned size will be reduced accordingly)
 * @returns {Number}
 * 			the byte-length
 */
function getLengthFor(recBuffers, index, sampleBytes, bytePadding){

	//get length
	var recLength = 0, blen;
	var decrFac = bytePadding > 0? bytePadding / sampleBytes : 0;//<- factor do decrease size in case of padding bytes
	for(var i=recBuffers.length - 1; i >= 0; --i){
		blen = recBuffers[i][index].byteLength;
		if(bytePadding > 0){
			recLength += blen - (decrFac * blen);
		} else {
			recLength += blen;
		}
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
function encodeWAV(samples, sampleRate, channels, bitsPerSample){

	var bytePerSample = bitsPerSample / 8;
	var length = samples.length * samples.BYTES_PER_ELEMENT;

	var buffer = new ArrayBuffer(44 + length);
	var view = new DataView(buffer);

	/* RIFF identifier */
	writeString(view, 0, 'RIFF');
	/* file length */
	view.setUint32(4, 36 + length, true);
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
	view.setUint32(28, sampleRate * channels * bytePerSample, true);
	/* block align (channel count * bytes per sample) */
	view.setUint16(32, channels * bytePerSample, true);
	/* bits per sample */
	view.setUint16(34, bitsPerSample, true);
	/* data chunk identifier */
	writeString(view, 36, 'data');
	/* data chunk length */
	view.setUint32(40, length, true);

	writeData(view, 44, samples)

	return view;
}

/**
 * data (missing) meta-data to STREAMINFO meta-data block of the FLAC data
 *
 * @param chunks {Array<Uint8Array} data chunks of encoded FLAC audio, where the first one is the one produced after encoder was initialized and feed the first/multiple audio frame(s)
 * @param metadata {FlacStreamInfo} the FLAC stream-info (meta-data)
 */
function addFLACMetaData(chunks, metadata, isOgg){

	var offset = 4;
	var dataIndex = 0;
	var data = chunks[0];//1st data chunk should contain FLAC identifier "fLaC" or OGG identifier "OggS"
	if(isOgg){
		offset = 13;
		dataIndex = 1;
		if(data.length < 4 || String.fromCharCode.apply(null, data.subarray(0, 4)) != "OggS"){
			console.error('Unknown data format: cannot add additional FLAC meta data to OGG header');
			return;
		}
	}

	data = chunks[dataIndex];//data chunk should contain FLAC identifier "fLaC"
	if(data.length < 4 || String.fromCharCode.apply(null, data.subarray(offset-4, offset)) != "fLaC"){
		console.error('Unknown data format: cannot add additional FLAC meta data to header');
		return;
	}

	if(isOgg){
		console.info('OGG Container: cannot add additional FLAC meta data to header due to OGG format\'s header checksum!');
		return;
	}

	//first chunk only contains the flac identifier string?
	if(data.length == 4){
		data = chunks[dataIndex + 1];//get 2nd data chunk which should contain STREAMINFO meta-data block (and probably more)
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
	view.setUint8(21 + offset, metadata.total_samples, true);//36 bit

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
function flac_file_processing_check_flac_format(ui8_data, isOgg){

	var offset = 4;//-> offset for end of FLAC identifier "fLaC"

	// check: is file really an OGG container file?
	if(isOgg){
		offset = 41;
		if(ui8_data.length < 4 || String.fromCharCode.apply(null, ui8_data.subarray(0, 4)) != "OggS"){
			console.error('ERROR: wrong format for OGG-file.');
			return false;
		}
	}

	// check: is file a compatible flac-file?
	if ((ui8_data.length < 38 + offset) ||
		(String.fromCharCode.apply(null, ui8_data.subarray(offset-4, offset)) != "fLaC")
	){
		console.error("ERROR: wrong format for flac-file.");
		return false;
	}

	var view = new DataView(ui8_data.buffer);
	//check last 7 bits of 4th byte for meta-data BLOCK type: must be STREAMINFO (0)
	if ((view.getUint8(offset) & 127 /* 0x7F */) != 0){
		console.error("ERROR: wrong format for flac-file.");
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
 *  converts the PCM data of the wav file (each sample stored as 8 or 16 or 24 bit value) into
 *  a format expected by the libflac-encoder method (each sample stored as 32 bit value in a 32-bit array)
 */
function wav_file_processing_convert_to32bitdata(arraybuffer, bps){

	var decFunc;
	switch(bps){
		case 8:
			decFunc = convert_8bitdata_to32bitdata;
			break;
		case 16:
			decFunc = convert_16bitdata_to32bitdata;
			break;
		case 24:
			decFunc = convert_24bitdata_to32bitdata;
			break;
	}
	if(!decFunc){
		// -> unsupported bit-depth
		return void(0);
	}

	var bytes = bps / 8;
	var ab_i16 = new DataView(arraybuffer, 44);
	var buf_length = ab_i16.byteLength;
	var buf32_length = buf_length / bytes;
	var buffer_i32 = new Uint32Array(buf32_length);
	var view = new DataView(buffer_i32.buffer);
	var index = 0;
	for (var j = 0; j < buf_length; j+=bytes){
		view.setInt32(index, decFunc(ab_i16,j), true);
		index += 4;
	}
	return buffer_i32;
}

/**
 *  converts the PCM data of the wav file (each sample stored as 8 bit value) into
 *  a format expected by the libflac-encoder method (each sample stored as 32 bit value in a 32-bit array)
 */
function convert_8bitdata_to32bitdata(dataView, i){
	return dataView.getUint8(i) - 128 /* 0x80 */;
}

/**
 *  converts the PCM data of the wav file (each sample stored as 16 bit value) into
 *  a format expected by the libflac-encoder method (each sample stored as 32 bit value in a 32-bit array)
 */
function convert_16bitdata_to32bitdata(dataView, i){
	return dataView.getInt16(i, true);
}

/**
 *  converts the PCM data of the wav file (each sample stored as 24 bit value) into
 *  a format expected by the libflac-encoder method (each sample stored as 32 bit value in a 32-bit array)
 */
function convert_24bitdata_to32bitdata(dataView, i){
	var b = (((dataView.getUint8(i + 2) << 8) | dataView.getUint8(i + 1)) << 8) | dataView.getUint8(i);
	if ((b & 8388608 /* 0x00800000 */ ) > 0) {
		b |= 4278190080;// 0xFF000000;
	} else {
		b &= 16777215;// 0x00FFFFFF;
	}
	return b;
}

/**
 *  create A-element for data BLOB and trigger download
 */
function forceDownload(blob, filename){
	var link = getDownloadLink(blob, filename, true);
	//NOTE: FireFox requires a MouseEvent (in Chrome a simple Event would do the trick)
	var click = document.createEvent("MouseEvent");
	click.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
	link.dispatchEvent(click);
}

/**
 *  create A-element for data BLOB
 */
function getDownloadLink(blob, filename, omitLinkLabel){
	var name = filename || 'output.flac';
	var url = (window.URL || window.webkitURL).createObjectURL(blob);
	var link = window.document.createElement('a');
	link.href = url;
	link.download = name;
	if(!omitLinkLabel){
		link.textContent = name;
	}
	return link;
}
