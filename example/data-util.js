
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
function exportFile(recBuffers){
	//get length
	var recLength = 0;
	for(var i=recBuffers.length - 1; i >= 0; --i){
		recLength += recBuffers[i].byteLength;
	}
	
	//convert buffers into one single buffer
	var samples = exportUI8ArrayBuffer(recBuffers, recLength);
	var the_blob = new Blob([samples]);
	return the_blob;
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
