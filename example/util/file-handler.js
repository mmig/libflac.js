
function setEnabled(enable){
	
	document.getElementById('files').disabled = !enable;
	
	var color = enable? '' : 'lightgray';
	var dropZone = document.getElementById('drop_zone');
	dropZone.style.backgroundColor = color;
	dropZone.style.color = color;
	dropZone.style.borderColor = color;
	
	//add/remove textual hint:
	var labelCl = enable? 'init-hint' : 'drop-hint';
	var labels = document.getElementsByClassName(labelCl);
	var label;
	for(var i=labels.length - 1; i >= 0; --i){
		label = labels[i];
		if(enable){
			label.parentElement.removeChild(label);
		} else {
			var el = document.createElement('div');
			el.classList.add('init-hint');
			el.textContent = 'Initializing libflac.js ...';
			el.style.color = 'black';
			label.appendChild(el);
		}
	}
	
}

/**
 * initialize event handlers (GUI) for HTML elements
 * 
 * @param onFileLoaded {Function} handler for (binary) file data, i.e. encoding/decoding file contents
 */
function initHandlers(onFileLoaded){
	
	//Flac may initialize asynchronously (e.g. minified version), so disable file-input
	// as long as it is not enabled:
	var isFlacInitialized = Flac.isReady();
	if(!isFlacInitialized){
		setEnabled(false);
		Flac.onready = function(){
			setEnabled(true);
		}
	}

	//create handler for loaded data/file
	var fileListHandler = createFileListHandler(onFileLoaded);
	
	//setup file-input
	document.getElementById('files').addEventListener('change', fileListHandler, false);
	
	//setup process button
	var btnEl = document.getElementById('files_button');
	if(btnEl){
		btnEl.addEventListener('click', handle_process_button_click, false);
	}
	
	//setup drag&drop.
	var dropZone = document.getElementById('drop_zone');
	dropZone.addEventListener('dragover', handleDragOver, false);
	dropZone.addEventListener('drop', fileListHandler, false);
	
	//----------- FUNCTIONS -----------------
	
	
	function createFileListHandler(onFileLoaded){
	
		return function handleFileSelect(evt) {
		
			evt.stopPropagation();
			evt.preventDefault();
			
			if(document.getElementById('files').disabled){
				return;
			}
		
			var files;
		
			// covers the dropZone and file select-element
			if (evt.dataTransfer){
				// drop element
				files = evt.dataTransfer.files; // FileList object.
			} else {
				// file select
				files = evt.target.files; // FileList object
			}
		
			// files is a FileList of File objects. List some properties.
			document.getElementById('list').innerHTML = '<ul id="file_list_info"></ul>';
			var fileListInfoEl = document.getElementById('file_list_info');
			var appendInfo = function(target){
				
				var sb = [];
				for(var i=1, size = arguments.length; i < size; ++i){
					sb.push(arguments[i]);
				}
	
				var html = target.innerHTML.replace(/<\/ul>\s*$/igm, '');
				target.innerHTML = html + sb.join('') +  '</ul>';
			}
			
			for (var i = 0, f; f = files[i]; i++) {
				
				var fileInfoId = 'file_info_'+i;
				appendInfo(fileListInfoEl, '<li>','<strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
						f.size, ' bytes, last modified: ',
						f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
						'<span id="', fileInfoId, '"></span></li>');
		
				var reader = new FileReader();
				
				reader.file_name = f.name;
				reader.file_info_id = fileInfoId;
		
				reader.onload = function(evt) {
					
					evt.fileInfoId = this.file_info_id;
					evt.fileName = this.file_name;
					
					onFileLoaded.apply(this, arguments);
				}
		
				reader.readAsArrayBuffer(f);
			}
		}
	}
	
	function handleDragOver(evt) {
		evt.stopPropagation();
		evt.preventDefault();
		evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
	}
	
	//fire event on file-chooser to resend same file
	function handle_process_button_click(evt){
		var event; // The custom event that will be created
	
		if (document.createEvent) {
			event = document.createEvent("HTMLEvents");
			event.initEvent("change", true, true);
		} else {
			event = document.createEventObject();
			event.eventType = "change";
		}
	
		event.eventName = "change";
	
		if (document.createEvent) {
			document.getElementById('files').dispatchEvent(event);
		} else {
			document.getElementById('files').fireEvent("on" + event.eventType, event);
		}
	}

}

function isDownload(){
	return document.getElementById('check_download').checked;
}

function isVerify(){
	return document.getElementById('check_verify').checked;
}

function getFileName(srcName, targetExt){
	
	var isFlac = /flac/i.test(targetExt);
	var source = isFlac? 'wav' : 'flac';
	var target = isFlac? 'flac' : 'wav';

	var reSrc = new RegExp('\.'+source+'$', 'i');
	var reTarget = new RegExp('\.'+target+'$', 'i');
	var fileName = srcName.replace(reSrc, '.'+target);
	if(!reTarget.test(fileName)){
		fileName += '.'+target;
	}
	
	return fileName;
}