
/**
 * Handle loaded FLAC file: decode to WAV 
 * 
 * @param evt
 * 			evt.result {Blob} binary file contents
 * 			evt.fileInfoId {String}
 * 			evt.fileName {String}
 */
function onFlacLoad(evt) {
	
	var fileInfo = [];

	var arrayBuffer = new Uint8Array(this.result);

	var decData = [];
	var result = decodeFlac(arrayBuffer, decData);
	console.log('decoded data array: ', decData);

	var metaData = result.metaData;
	if(metaData) for(var n in metaData){
		fileInfo.push('</br>', n, ': ', metaData[n]);	
	}

	var isOk = result.status;
	fileInfo.push('</br></br>processing finished with return code: ', isOk);

	var fileInfoEl = document.getElementById(evt.fileInfoId);
	fileInfoEl.innerHTML = fileInfo.join('') ;
	
	if(isDownload()){

		//using data-util.js utility function(s)
		var blob = exportWavFile(decData, metaData.sampleRate, metaData.channels);
		
		var fileName = getFileName(evt.fileName, 'wav');

		//using data-util.js utility function(s)
		forceDownload(blob, fileName);
	}
};

//initialize
initHandlers(onFlacLoad);
