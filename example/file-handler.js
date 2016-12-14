
document.getElementById('files').addEventListener('change', handleFileSelect, false);

document.getElementById('files_button').addEventListener('click', handle_process_button_click, false);

// Setup the dnd listeners.
var dropZone = document.getElementById('drop_zone');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleFileSelect, false);

//----------- FUNCTIONS -----------------
	
function handleFileSelect(evt) {
    check_download = document.getElementById('check_download').checked;
    check_googleasr = document.getElementById('check_googleasr').checked;

    evt.stopPropagation();
    evt.preventDefault();

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
    var output = [];
    for (var i = 0, f; f = files[i]; i++) {
        output.push('<li>','<strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
                      f.size, ' bytes, last modified: ',
                      f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a');

        var reader = new FileReader();
        
        reader.file_output = output;

        reader.onload = function(e) {
            arrayBuffer = new Uint8Array(this.result);
            // // var wav_parameters = handle_buffer_operations(arrayBuffer);
            // var wav_parameters = wav_file_processing_encode_wav_buffer(arrayBuffer);

            // if (typeof wav_parameters !== "undefined" && wav_parameters !== null){
                // reader.file_output.push('</br>total samples: ', wav_parameters.total_samples, '</br>sample rate: ', wav_parameters.sample_rate, '</br>channels: ', wav_parameters.channels, '</br>bps: ', wav_parameters.bps);
            // }
            reader.file_output.push('</li>');
            // document.getElementById('list').innerHTML += '<ul>' + reader.file_output.join('') + '</ul>';
            document.getElementById('list').innerHTML = '<ul>' + reader.file_output.join('') + '</ul>';
        }
        
        reader.readAsArrayBuffer(f);      
    }
    // document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
}

function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

// fire event on file-chooser to resend same file
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
