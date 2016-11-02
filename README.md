libflac.js
==========

[FLAC][flac] encoder compiled in JavaScript using _emscripten_.


In order to build _libflac.js_, make sure you have _emscripten_ installed.

On running `make`, the build process will download the sources for the
FLAC library, extract it, and build the JavaScript version of libflac.

For immediate use, the `/dist` sub-directory contains the compiled
JavaScript file `libflac.js`, along with a minified version.


Building
------

Building libflac.js requires that [emscripten] is installed and configured.

See the [wiki][emscripten-wiki] and the [main site][emscripten-main] for 
documentation, tutorials etc.


If you want to create the minified _libflac_ file, you also need to add the
[closure compiler][closure-compiler] to `/libs/compiler.jar`
(you can download the latest JAR from [here][closure-compiler-download-latest])

Start build process by executing the `Makefile`.

(build process was tested on Unbuntu 12.10)


Usage
------

Encoding

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
    flac_ok = 1;


////////
// [1] INIT -> IN: config { ... }

//overwrite default configuration from config object
COMPRESSION = config.compression;
BPS = config.bps;
SAMPLERATE = config.samplerate;
CHANNELS = config.channels;

//init encoder
flac_encoder = Flac.init_libflac(SAMPLERATE, CHANNELS, BPS, COMPRESSION, 0);

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

var flac_return = Flac.encode_buffer_pcm_as_flac(flac_encoder, buffer_i32, CHANNELS, buf_length);
if (flac_return != true){
    console.log("Error: encode_buffer_pcm_as_flac returned false. " + flac_return);
}


////////
// [3] FINISH ENCODING

flac_ok &= Flac.FLAC__stream_encoder_finish(flac_encoder);
console.log("flac finish: " + flac_ok);

////////
// [4] ... do something with the encoded data, e.g.
//     merge "encoded pieces" in encBuffer into one single Uint8Array...

```

Decoding

var flac_decoder,
BUFSIZE = 4096,
CHANNELS = 1,
SAMPLERATE = 44100,
COMPRESSION = 5,
BPS = 16,
flac_ok = 1,
current_chunk,
num_chunks = 0;

function read_callback_fn(p_decoder, buffer, bytes, p_client_data){
    console.log('decode read callback', num_chunks);
    Flac.decode_buffer_flac_process(buffer, current_chunk, bytes);     
    num_chunks++;

    return;
}

function write_callback_fn(){
    console.log('decode write callback');
}

function error_callback_fn(decoder, err, client_data){
    console.log('decode error callback', err);
    Flac.FLAC__stream_decoder_finish(decoder);
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
current_chunk = chunk; // must save it to be used in the callback read function (see read_callback_fn)

var flac_return = Flac.decode_buffer_flac_as_pcm(flac_decoder);
if (flac_return != true){
    console.log("Error: decode_buffer_flac_as_pcm returned false. " + flac_return);
}

// finish Decoding
flac_ok &= Flac.FLAC__stream_decoder_finish(flac_decoder);



Authors
------

Copyright (C) 2013-2014 DFKI GmbH

F. Petersen
A. Russ


Acknowledgments
------
This project was inspired by Krennmair's [libmp3lame-js] project.


License
-------

libflac.js is compiled from the reference implementation of FLAC (BSD license)
and published under the MIT license (see file LICENSE).

[emscripten]: https://github.com/kripken/emscripten
[emscripten-wiki]: https://github.com/kripken/emscripten/wiki
[emscripten-main]: http://kripken.github.io/emscripten-site/
[closure-compiler]: https://github.com/google/closure-compiler
[closure-compiler-download-latest]: http://dl.google.com/closure-compiler/compiler-latest.zip
[libmp3lame-js]: https://github.com/akrennmair/libmp3lame-js
[flac]: https://xiph.org/flac/index.html
[speech-to-flac]: https://github.com/mmig/speech-to-flac
