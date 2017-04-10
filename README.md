libflac.js
==========

[FLAC][6] encoder compiled in JavaScript using _emscripten_.


In order to build _libflac.js_, make sure you have _emscripten_ installed.

On running `make`, the build process will download the sources for the
FLAC library, extract it, and build the JavaScript version of libflac.

For immediate use, the `/dist` sub-directory contains the compiled
JavaScript file `libflac.js`, along with a minified version.

__Encoder Demo__  
Try the [Encoding Demo][14] for encoding `*.wav` files to FLAC.  
Or try the [speech-to-flac][12] [demo][13] that encodes the audio stream from a microphone to FLAC.  

__Decoder Demo__  
Try the [Decoding Demo][15] for decoding `*.flac` files to `*.wav` files.  
_TODO_ example for decoding a FLAC audio stream (i.e. where data/size is not known beforehand).

__API Documentation__  
See [apidoc/index.html][16] for the API documentation. 


## Usage
------

### Including libflac.js

Include the library file, e.g. 
```html
<script src="libflac3-1.3.2.js" type="text/javascript"></script>
```
or in a WebWorker:
```javascript
importScripts('libflac3-1.3.2.js');
```

__Default Library:__
 * `libflac<lib version>-<flac version>.js`

__Minified Library:__
 * `libflac<lib version>-<flac version>.min.js`
 * `libflac<lib version>-<flac version>.min.js.mem` (required; will be loaded by the library)
 * `libflac<lib version>-<flac version>.min.js.symbols` (optional; contains renaming information)
 * __NOTES__ for using the minified version (`.min.js`):
    * the corresponding `.mem` file must be included in the same directory as the `.min.js` file
    * the `.mem` file must not be renamed (or the `.min.js` must be edited accordingly)
    * if the minified library is included from a location other than the web-page/web-worker, then
      the path to directory of the library must be given as a global variable `FLAC_SCRIPT_LOCATION`
      before loading the library (this is necessary for loading the `.mem` file).  
      The path must end with a `/` (slash).  
      Example for web page:
      ```html
        <script type="text/javascript">window.FLAC_SCRIPT_LOCATION = 'libs/';</script>
	    <script src="libs/libflac-1.3.2.min.js" type="text/javascript"></script>
      ```  
      or when loading the library from a WebWorker:  
      ```javascript
        self.FLAC_SCRIPT_LOCATION = 'libs/';
        importScripts('libs/libflac-1.3.2.min.js');
      ```
    * the minified library loads asynchronously -- it must not be used, before it is loaded.  
      For checking, if the library is ready before using the library:  
      ```javascript
      if( !Flac.isReady() ){
        Flac.onready = function(){ /*some code that gets executed when library is ready */ };
      }
      ```
      NOTE that `onready()` will not be called again, when `Flac.isReady()` is already `true`.


__Development Library:__
 * `libflac<lib version>-<flac version>.dev.js`
 * `libflac<lib version>-<flac version>.dev.js.map` (optional; mapping to C code)



### Encoding with libflac.js

Generally, `libflac.js` supports a subset of the [libflac encoding interface][8] for encoding audio data to FLAC (no full support yet!). 
_The current build in `/dist` does not support the OGG container format; but a custom build could be made to support OGG._

See [example/encode.html][10] for a small example,
on how to encode a `WAV` file. 

For a larger example on how to encode audio data from the 
microphone see the [Speech to FLAC][9] example.

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
var status_encoder = Flac.init_encoder_stream(flac_encoder, function(encodedData /*Uint8Array*/, bytes, samples, current_frame){
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

var flac_return = Flac.FLAC__stream_encoder_process_interleaved(flac_encoder, buffer_i32, buf_length);
if (flac_return != true){
    console.log("Error: FLAC__stream_encoder_process_interleaved returned false. " + flac_return);
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

### Decoding with libflac.js

Generally, `libflac.js` supports a subset of the [libflac decoding interface][7] for decoding audio data from FLAC (no full support yet!). 
_The current build in `/dist` does not support the OGG container format; but a custom build could be made to support OGG._

See [example/decode.html][11] for a small example,
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
VERIFY = config.isVerify;//verification can be disabled for speeding up decoding process


// init decoder
var flac_decoder = Flac.init_libflac_decoder(VERIFY);

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
    // buffer is an Array of the decoded audio data (Uint8Array):
    // the length of array corresponds to the channels, i.e. there is an Uint8Array for each channel)
	decBuffer.push(buffer);
}

//[1] (c) optional callbacks for receiving details about errors and/or metadata

function error_callback_fn(decoder, err, client_data){
    console.error('decode error callback', err);
}

function metadata_callback_fn(data){
	// data -> [example] {
	//	min_blocksize: 4096,
	//	max_blocksize: 4096,
	//	min_framesize: 14,
	//	max_framesize: 5408,
	//	sampleRate: 44100,
	//	channels: 2,
	//	bitsPerSample: 16,
	//	total_samples: 267776,
	//	md5sum: "50d4d469448e5ea75eb44ab6b7f111f4"
	//}
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
	    
		flac_return &= Flac.FLAC__stream_decoder_process_single(flac_decoder);
		state = Flac.FLAC__stream_decoder_get_state(flac_decoder);
	}
	
	flac_ok &= flac_return != false;
	
} else if(mode == 'v2'){

	// VARIANT 2: decode complete data stream, all at once
	flac_return &= Flac.FLAC__stream_decoder_process_until_end_of_stream(flac_decoder);
	
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

### API

See the [doc/index.html][16] for the API documentation.

## Building
------

Building libflac.js requires that [emscripten][1] is installed and configured.

See the [documentation][3] and the [main site][2] for 
an introduction, tutorials etc.

For changing the targeted libflac version, modify the `Makefile`:
```
...
FLAC_VERSION:=1.3.2
...
```

### Build *nix (libflac 1.3.0)

Start build process by executing the `Makefile`:
```
make
```
(build process was tested on Unbuntu 12.10)


### Build Windows/VisualStudio 10 (libflac 1.3.0)

__*EXPERIMENTAL*__

 * __Prerequisites:__ 
   * VisualStudio 10
   * Emscripten plugin [vs-tool][4] (automatically installed, if Emscripten Installer was used)
   * OGG library: compile and include OGG in libflac for avoiding errors (or edit sources/project to remove OGG dependency); see README of libflac for more details (section for compiling in Windows)

Open the solution file `FLAC.sln` and select the project `libFLAC_static`.

In the `Configuration Manager`, for `libFLAC_static` select `<New...>`, and then `Emscripten` as platform (`vs-tool` needs to be installed for this); change option `Copy settings from:` to `<Empty>`, and the press `OK`.

Then open the project settings for `libFLAC_static`, and modify settings for `Configuration `:
 * `Clang C/C++`: `Additional Include Directories` add entries:
   ```
   .\include
   ..\..\include
   ```
 * `Clang C/C++` : `Preprocessor` add entries for `Preprocessor Definitions (-D)`:
   ```
   HAVE_SYS_PARAM_H
   HAVE_LROUND
   VERSION="1.3.0"
   ```
   
   ```
   DEBUG
   _LIB
   FLAC__HAS_OGG
   VERSION="1.3.0"
   ```

* modify project (if without OGG support): remove the source files (*.c) and headers (*.h) that start with `ogg*` from project (remove or "Exclude from project"); or include OGG library (cf. README of libflac for details)
   

* Modify sources file:
 * `flac-1.3.0\src\libFLAC\format.c` add the following at the beginning (e.g. after the `#include` statements):
   ```
	#define VERSION "1.3.0"
   ```


### Building *nix (libflac 1.3.2)

For libflac version 1.3.2, the sources / configuration require some changes, before libflac.js can be successfully built.

 * in `flac-1.3.2/Makefile.in` at line 400, disable (or remove) the last entry `microbench` in the line, e.g. change to:
   ```
   SUBDIRS = doc include m4 man src examples test build obj #microbench
   ```
 * in `flac-1.3.2/src/libFLAC/cpu.c` at line 89, disable (or remove) the following lines:
   
   ```
   #elif defined __GNUC__
       uint32_t lo, hi;
       asm volatile (".byte 0x0f, 0x01, 0xd0" : "=a"(lo), "=d"(hi) : "c" (0));
       return lo;
    ```

After these changes, continue compilation with
```
make emmake
```


### Change Library API

The API for _libflac.js_ (e.g. exported functions) are mainly specified in `libflac_post.js`.

Functions that will be exported/used from the native `libflac` implementation need to be declared in
the compile option `-s EXPORTED_FUNCTIONS='[...]'` (see variable `EMCC_OPTS:=...` in `Makefile`);
note, when manually editing `EXPORTED_FUNCTIONS`, that the function-names must be prefixed with `_`, i.e. for
function `the_function`, the string for the exported function would be `_the_function`.

There is a [helper script](tools/extract_EXPORTED_FUNCTIONS.js) that will try to extract the compile option from `libflac_post.js` (i.e. the list of functions that need to be declared).
Run the script with `Node.js` in `tools/` (and copy&paste the output value):
```
node extract_EXPORTED_FUNCTIONS.js
```



## Contributors
------

Copyright (C) 2013-2017 DFKI GmbH
 
See `CONTRIBUTORS` for list of contributors.

## Acknowledgments
------
This project was inspired by Krennmair's [libmp3lame-js][5] project for [JS mp3][5] encoding.


## License
-------

libflac.js is compiled from the reference implementation of FLAC (BSD license)
and published under the MIT license (see file LICENSE).


[1]: https://github.com/kripken/emscripten
[2]: https://kripken.github.io/emscripten-site
[3]: https://kripken.github.io/emscripten-site/docs
[4]: https://kripken.github.io/emscripten-site/docs/getting_started/getting_started_with_emscripten_and_vs2010.html
[5]: https://github.com/akrennmair/libmp3lame-js
[6]: https://xiph.org/flac/index.html
[7]: https://xiph.org/flac/api/group__flac__stream__decoder.html
[8]: https://xiph.org/flac/api/group__flac__stream__encoder.html
[9]: https://github.com/mmig/speech-to-flac
[10]: example/encode.html
[11]: example/decode.html
[12]: https://github.com/mmig/speech-to-flac
[13]: https://mmig.github.io/speech-to-flac/
[14]: https://mmig.github.io/libflac.js/example/encode.html
[15]: https://mmig.github.io/libflac.js/example/decode.html
[16]: https://mmig.github.io/libflac.js/apidoc/
