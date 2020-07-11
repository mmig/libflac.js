
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
		//insert download links for binary metadata
		metadataLinks.forEach(function(l){
			var sp = document.getElementById(l.id);
			l.id = 'a'+l.id;
			sp.parentElement.replaceChild(l, sp);
		});
	}

	if(!result.error){

		//using data-util.js utility function(s)
		var blob = exportWavFile(decData, metaData.sampleRate, metaData.channels, metaData.bitsPerSample);

		//using data-util.js utility function(s)
		var fileName = getFileName(evt.fileName, 'wav');

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
		var label = '', name = 'Metadata_'+i+'_'+getMetadataName(val);
		if(val.data && val.data.data){
			//for picture metadata: create Blob download link from image's Uint8Array
			var mime = val.data.mime_type;
			var l = getDownloadLink(new Blob([val.data.data.buffer], {type: mime}), name+'.'+mime.replace(/^.*?\//, ''));
			val.data.data = void(0);
			l.id = 'mdlink'+i;
			linkList.push(l);
			label = '<span id="mdlink'+i+'"></span>';
		} else {
			label = name;
		}

		//create tooltip with the metadata's JSON
		var jsonStr = JSON.stringify(val.data || val, null, 2);
		label +=  '&nbsp;<span class="hint" title=\''+jsonStr+'\'></span>'

		return '<span>'+label+'</span>';
	}).join(', ');
}

function isRawMetadata(){
	return document.getElementById('check_raw_metadata').checked;
}

//initialize
initHandlers(onFlacLoad);
