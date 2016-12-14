
var flac_decoder,
BUFSIZE = 4096,
CHANNELS = 1,
SAMPLERATE = 44100,
COMPRESSION = 5,
BPS = 16,
flac_ok = 1,
current_chunk,
num_chunks = 0;

var isTested = false;
function myReadCallback(bufferSize){

	if(isTested/* is at end of input stream, i.e. nothing to read any more */){
		return {buffer: null, readDataLength: 0, error: false};
	}
	
	isTested = true;

	var _buffer = new ArrayBuffer(bufferSize);
	var numberOfReadBytes;
	try{
	
		new DataView(_buffer).setUint8(0, 101);//set some value at start
		new DataView(_buffer).setUint8(bufferSize-3, 85);//set some value near the end
		
		//read data from some source into _buffer
		// ...and store number of read bytes into var numberOfReadBytes (i.e. length of read data with regard to an UINT8-view on the ArrayBuffer):
		numberOfReadBytes = bufferSize-2;//...
		
	} catch(err){
		console.error(err);//DEBUG
		return {buffer: null, readDataLength: 0, error: true};
	}
	
	return {buffer: _buffer, readDataLength: numberOfReadBytes, error: false};
}

var read_callback_fn = myReadCallback;

function write_callback_fn(){
    console.log('decode write callback', arguments);
}

function error_callback_fn(decoder, err, client_data){
    console.log('decode error callback', err);
    // Flac.FLAC__stream_decoder_finish(decoder);
}

// init decoder
flac_decoder = Flac.init_libflac_decoder(SAMPLERATE, CHANNELS, BPS, COMPRESSION, 0);
////
if (flac_decoder != 0){
    var status_decoder = Flac.init_decoder_stream(flac_decoder, read_callback_fn, error_callback_fn);
    flac_ok &= (status_decoder == 0);

    console.log("flac decode init     : " + flac_ok);//DEBUG
    console.log("status decoder: " + status_decoder);//DEBUG

    INIT = true;
} else {
    console.error("Error initializing the decoder.");
}

// decode a chunk of flac data
//FIXME current_chunk = chunk; // must save it to be used in the callback read function (see read_callback_fn)

var flac_return = Flac.decode_buffer_flac_as_pcm(flac_decoder);
if (flac_return != true){
    console.log("Error: decode_buffer_flac_as_pcm returned false. " + flac_return);
}

// finish Decoding
flac_ok &= Flac.FLAC__stream_decoder_finish(flac_decoder);
