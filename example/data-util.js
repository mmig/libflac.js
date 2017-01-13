
/* --- FILE-BUFFER-OPERATIONS */
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
 *  creates blob element from libflac-decoder output
 */
function exportFile(recBuffers, sampleRate){
	//get length
	var recLength = 0;
	for(var i=recBuffers.length - 1; i >= 0; --i){
		recLength += recBuffers[i].byteLength;
	}
	
	//convert buffers into one single buffer
	var samples = exportUI8ArrayBuffer(recBuffers, recLength);
	var dataView = encodeWAV(samples, sampleRate, 1/*mono*/);
	var the_blob = new Blob([dataView], {type: 'audio/wav'});
	return the_blob;
}

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
