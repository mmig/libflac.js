
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

	var isOgg = /\.og(g|a)$/i.test(evt.fileName);
	var decData = [];
	var result = decodeFlac(arrayBuffer, decData, isVerify(), isOgg || isUseOgg(), isRawMetadata());
	console.log('decoded data array: ', decData);

	if(result.error){
		fileInfo.push('</br><span style="color: red;">', result.error, '</span>');
	}

	var metaData = result.metaData, metadataLinks = [];
	if(metaData){

		fileInfo.push('</br><strong>Input FLAC info:</strong><table border="0">');
		for(var n in metaData){
			fileInfo.push(
				'<tr><td><em style="color: #555;">', n, ' </em></td><td> <code>',
				fileInfoItemToStr(metaData[n], metadataLinks), '</code></td></tr>'
			);
		}
		fileInfo.push('</table>');
	}

	var isOk = result.status;
	fileInfo.push('</br>processing finished with return code: ', isOk, (isOk == 1? ' (OK)' : ' (with problems)'));

	var fileInfoEl = document.getElementById(evt.fileInfoId);
	fileInfoEl.innerHTML = fileInfo.join('');

	if(metadataLinks.length > 0){
		metadataLinks.forEach(function(l){
			var sp = document.getElementById(l.id);
			l.id = 'a'+l.id;
			sp.appendChild(l);
		});
	}

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

function getMetadataName(val){
	var type = val.type;
	if (type === 0) return "STREAMINFO";
	if (type === 1) return "PADDING";
	if (type === 2) return "APPLICATION";
	if (type === 3) return "SEEKTABLE";
	if (type === 4) return "VORBISCOMMENT";
	if (type === 5) return "CUESHEET";
	if (type === 6) return "PICTURE";
	if (type === 7) return "UNKNOWN_METADATA";
	if (type === 126) return "MAX_METADATA_TYPE";
	return "UNKNOWN";
}

function fileInfoItemToStr(val, linkList){
	return !Array.isArray(val)? val : val.map(function(val, i){
		var l = getDownloadLink(new Blob([val.raw.buffer], {type: 'application/octet-stream'}), 'Metadata'+i+'_'+getMetadataName(val)+'.bin')
		l.id = 'mdlink'+i;
		linkList.push(l);
		return '<span id="mdlink'+i+'"></span>';
	}).join(', ');
}

function isRawMetadata(){
	return document.getElementById('check_raw_metadata').checked;
}

//initialize
initHandlers(onFlacLoad);
