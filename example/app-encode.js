
/**
 * Handle loaded WAV file: encode to FLAC 
 * 
 * @param evt
 * 			evt.result {Blob} binary file contents
 * 			evt.fileInfoId {String}
 * 			evt.fileName {String}
 */
function onWavLoad(evt) {
	
	var fileInfo = [];

	var arrayBuffer = new Uint8Array(this.result);

	var encData = [];
	var result = encodeFlac(arrayBuffer, encData, isVerify());
	console.log('encoded data array: ', encData);
	
	if(result.error){
		fileInfo.push('</br><span style="color: red;">', result.error, '</span>');
	}

	var metaData = result.metaData;
	if(metaData){
		fileInfo.push('</br><strong>Encoded FLAC info:</strong><table border="0">');
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
		var blob = exportFlacFile(encData, metaData);
		
		var fileName = getFileName(evt.fileName, 'flac');

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
initHandlers(onWavLoad);
