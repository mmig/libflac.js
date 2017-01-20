
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
	var result = decodeFlac(arrayBuffer, decData, isVerify());
	console.log('decoded data array: ', decData);
	
	if(result.error){
		fileInfo.push('</br><span style="color: red;">', result.error, '</span>');
	}

	var metaData = result.metaData;
	if(metaData){
		fileInfo.push('</br><strong>Input FLAC info:</strong><table border="0">');
		for(var n in metaData){
			fileInfo.push(
				'<tr><td><em style="color: #555;">', n, ' </em></td><td> <code>',
				metaData[n], '</code></td></tr>'
			);
		}
		fileInfo.push('</table>');
	}

	var isOk = result.status;
	fileInfo.push('</br>processing finished with return code: ', isOk, (isOk == 1? ' (OK)' : ' (with problems)'));

	var fileInfoEl = document.getElementById(evt.fileInfoId);
	fileInfoEl.innerHTML = fileInfo.join('') ;
	
	if(!result.error){

		//using data-util.js utility function(s)
		var blob = exportWavFile(decData, metaData.sampleRate, metaData.channels, metaData.bitsPerSample);
		
		var fileName = getFileName(evt.fileName, 'wav');

		//using data-util.js utility function(s)

		//using data-util.js utility function(s)
		if(isDownload()){
			forceDownload(blob, fileName);
		} else {
			var anchor = getDownloadLink(blob, fileName);
			var br = window.document.createElement('br');
			fileInfoEl.appendChild(br);
			fileInfoEl.appendChild(anchor);
		}
	}
};

//initialize
initHandlers(onFlacLoad);
