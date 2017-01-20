libflac.js
==========

[FLAC][flac] encoder compiled in JavaScript using _emscripten_.


In order to build _libflac.js_, make sure you have _emscripten_ installed.

On running `make`, the build process will download the sources for the
FLAC library, extract it, and build the JavaScript version of libflac.

For immediate use, the `/dist` sub-directory contains the compiled
JavaScript file `libflac.js`, along with a minified version.


# Building
------

Building libflac.js requires that [emscripten] is installed and configured.

See the [documentation][emscripten-doc] and the [main site][emscripten-main] for 
an introduction, tutorials etc.


Start build process by executing the `Makefile`:
```
make
```
(build process was tested on Unbuntu 12.10)


## Change Build

The API for _libflac.js_ (e.g. exported functions) are mainly specified in `libflac_post.js`.

Functions that will be exported/used from the native `libflac` implementation need to be declared in
the compile option `-s EXPORTED_FUNCTIONS='[...]'` (see variable `EMCC_OPTS:=...` in `Makefile`).

There is a [helper script](tree/master/tools/extract_EXPORTED_FUNCTIONS.js) that will try to extract the compile option from `libflac_post.js` (i.e. the list of functions that need to be declared).
Run the script with `Node.js` in `tools/` (and copy&paste the output value):
```
node extract_EXPORTED_FUNCTIONS.js
```

> __NOTE:__ The number of maximal callbacks (see explanation in _Usage_ section below) can be changed with the
> `RESERVED_FUNCTION_POINTERS` option, see `EMCC_OPTS:=...` in `Makefile`.


# Usage
------


> ### Important
> Encoding and decoding requires registration of callbacks. Note that only a limit number of callbacks can be registered at once, 
> i.e. for encoders/decoders that have been _initialized_ but not _finished_ yet.
> 
> Currently the number of callbacks is limited to `20` which should be enough for most usage scenarios:
> a single encoder may take 1-2 callbacks, and a decoder 2-4 callbacks.
> 
> The function `Flac.getFreeCallbackSlots()` returns the number of currently available callback-slots. If
> the number of free slots is exceeded, an error will be thrown upon trying to register callbacks (i.e. when invoking the
> init-functions for the encoder/decoder).
> 
> The limit for callbacks can be changed by re-compiling `libflac.js` with a different setting for
> the `RESERVED_FUNCTION_POINTERS` option.

## Encoding

See [example/encode.html][enc_example] for a small example,
on how to encode a `WAV` file. 

For a larger example on how to encode audio data from the 
microphone see the [Speech to FLAC][speech-to-flac] example.

Small usage example:
```javascript

//load libflac.js -> Flac object exported into global namespace

var flac_encoder,
    BUFSIZE = 4096,
    CHANNELS = 1,
    SAMPLERATE = 44100,
    COMPRESSION = 5,
    BPS = 16,
    VERIFY = false,
    flac_ok = 1;


////////
// [1] INIT -> IN: config { ... }

//overwrite default configuration from config object
COMPRESSION = config.compression;
BPS = config.bps;
SAMPLERATE = config.samplerate;
CHANNELS = config.channels;
VERIFY = config.isVerify;//verification can be disabled for speeding up encoding process

//init encoder
flac_encoder = Flac.init_libflac_encoder(SAMPLERATE, CHANNELS, BPS, COMPRESSION, 0, VERIFY);

if (flac_encoder == 0){
	return;
}

var encBuffer = [];
var status_encoder = Flac.init_encoder_stream(flac_encoder, function(encodedData /*Uint8Array*/, bytes){
	//store all encoded data "pieces" into a buffer 
	encBuffer.push(encodedData);
});
flac_ok &= (status_encoder == 0);


////////
// [2] ENCODE -> IN: PCM Float32 audio data (this example: mono stream)
// ... repeat encoding step [2] as often as necessary

var buf_length = buffer.length;
var buffer_i32 = new Uint32Array(buf_length);
var view = new DataView(buffer_i32.buffer);
var volume = 1;
var index = 0;
for (var i = 0; i < buf_length; i++){
    view.setInt32(index, (buffer[i] * (0x7FFF * volume)), true);
    index += 4;
}

var flac_return = Flac.encode_buffer_pcm_as_flac(flac_encoder, buffer_i32, buf_length);
if (flac_return != true){
    console.log("Error: encode_buffer_pcm_as_flac returned false. " + flac_return);
}


////////
// [3] FINISH ENCODING

flac_ok &= Flac.FLAC__stream_encoder_finish(flac_encoder);
console.log("flac finish: " + flac_ok);

//after usage: free up all resources for the encoder
Flac.FLAC__stream_encoder_delete(flac_encoder);

////////
// [4] ... do something with the encoded data, e.g.
//     merge "encoded pieces" in encBuffer into one single Uint8Array...
```


## Decoding

See [example/decode.html][dec_example] for a small example,
on how to decode a `FLAC` file.

Small usage example:
```javascript
var BUFSIZE = 4096,
	CHANNELS = 1,
	SAMPLERATE = 44100,
	COMPRESSION = 5,
	BPS = 16,
	VERIFY = true,
	meta_data;



////////
// [1] INIT -> IN: config { ... }
//             IN: flacData Uint8Array (FLAC data)

//overwrite default configuration from config object
COMPRESSION = config.compression;
BPS = config.bps;
SAMPLERATE = config.samplerate;
CHANNELS = config.channels;
VERIFY = config.isVerify;//verification can be disabled for speeding up decoding process


// init decoder
var flac_decoder = Flac.init_libflac_decoder(SAMPLERATE, CHANNELS, BPS, COMPRESSION, 0, VERIFY);

if (flac_decoder == 0){
	return;
}


var init_status = Flac.init_decoder_stream(flac_decoder, read_callback_fn, write_callback_fn, error_callback_fn, metadata_callback_fn);

if (init_status != 0){
	return;
}

//[1] (a) setup reading input data
var currentDataOffset = 0;
var size = flacData.buffer.byteLength;

//function that will be called for reading the input (FLAC) data:
function read_callback_fn(bufferSize){

    var start = currentDataOffset;
    var end = currentDataOffset === size? -1 : Math.min(currentDataOffset + bufferSize, size);
    
    var _buffer;
    var numberOfReadBytes;
    if(end !== -1){
    	
    	_buffer = flacData.subarray(currentDataOffset, end);
    	numberOfReadBytes = end - currentDataOffset;
    	
    	currentDataOffset = end;
    } else {
    	//nothing left to read: return zero read bytes (indicates end-of-stream)
    	numberOfReadBytes = 0;
    }

    return {buffer: _buffer, readDataLength: numberOfReadBytes, error: false};
}


//[1] (b) setup writing (decoded) output data

//for "buffering" the decoded data:
var decBuffer = [];

//function that will be called for decoded output data (WAV audio)
function write_callback_fn(buffer){
    // buffer is the decoded audio data (Uint8Array)
	decBuffer.push(buffer);
}

//[1] (c) optional callbacks for receiving details about errors and/or metadata

function error_callback_fn(decoder, err, client_data){
    console.error('decode error callback', err);
}

function metadata_callback_fn(data){
	console.info('meta data: ', data);
}

var flac_ok = 1;
var status_decoder = Flac.init_decoder_stream(
	flac_decoder, 
	read_callback_fn, write_callback_fn,	//required callbacks
	error_callback_fn, metadata_callback_fn	//optional callbacks
);
flac_ok &= status_decoder == 0;

if(flac_ok != 1){
	return;
}

////////
// [2] DECODE -> IN: FLAC audio data (see above, the read-callack)
// ... repeat encoding step [2] as often as necessary

var mode = 'v1';// 'v1' | 'v2'
var state = 0;
var flac_return = 1;

if(mode == 'v1'){
	// VARIANT 1: decode chunks of flac data, one by one
	
	//request to decode data chunks until end-of-stream is reached:
	while(state <= 3 && flac_return != false){
	    
		flac_return &= Flac.decode_buffer_flac_as_pcm(flac_decoder);
		state = Flac.FLAC__stream_decoder_get_state(flac_decoder);
	}
	
	flac_ok &= flac_return != false;
	
} else if(mode == 'v2'){

	// VARIANT 2: decode complete data stream, all at once
	flac_return &= Flac.decode_stream_flac_as_pcm(flac_decoder);
	
	//optionally: retrieve status
	state = Flac.FLAC__stream_decoder_get_state(flac_decoder);
}


if (flac_return != true){
	return;
}

////////
// [3] FINISH DECODING

// finish Decoding
flac_ok &= Flac.FLAC__stream_decoder_finish(flac_decoder);

//after usage: free up all resources for the decoder
Flac.FLAC__stream_decoder_delete(flac_decoder);

////////
// [4] ... do something with the decoded data, e.g.
//     merge "decoded pieces" in decBuffer into a single data stream and add WAV header...

```


Contributors
------

Copyright (C) 2013-2017 DFKI GmbH
 
See `CONTRIBUTORS` for list of contributors.

Acknowledgments
------
This project was inspired by Krennmair's [libmp3lame-js] project.


License
-------

libflac.js is compiled from the reference implementation of FLAC (BSD license)
and published under the MIT license (see file LICENSE).

[emscripten]: https://github.com/kripken/emscripten
[emscripten-doc]: https://kripken.github.io/emscripten-site/docs/
[emscripten-main]: https://kripken.github.io/emscripten-site/
[closure-compiler]: https://github.com/google/closure-compiler
[libmp3lame-js]: https://github.com/akrennmair/libmp3lame-js
[flac]: https://xiph.org/flac/index.html
[speech-to-flac]: https://github.com/mmig/speech-to-flac
[enc_example]: tree/master/example/encode.html
[dec_example]: tree/master/example/decode.html
