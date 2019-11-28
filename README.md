libflac.js
==========

[![npm](https://img.shields.io/npm/v/libflacjs)](https://www.npmjs.com/package/libflacjs)
![GitHub package.json version](https://img.shields.io/github/package-json/v/mmig/libflac.js/master)
[![emscripten version](https://img.shields.io/badge/emsripten-1.39.3-green)][1]
[![libFLAC version](https://img.shields.io/badge/libFLAC-1.3.2-yellow)][6]
[![libogg version](https://img.shields.io/badge/libogg-1.3.4-yellow)][18]

[FLAC][6] data stream encoder and decoder compiled in JavaScript using _emscripten_.

__Features__  
 * available as pure JavaScript, JavaScript+_binary_, JavaScript+WASM
 * encode/decode data all-at-once (~ _file_) or chunk-by-chunk (~ _stream_)
 * supported container formats: native FLAC container (`*.flac`), OGG container (`*.ogg`)

For immediate use, the `/dist` sub-directory contains the compiled
files for the `libflac.js` JavaScript library, as well as a minified version.

> Complied from `libFLAC` (static `C` library) version: 1.3.2\
> Used library `libogg` (static `C` library) version: 1.3.4\
> Used compiler `Emscripten` version: 1.39.2\
> Used compiler `Emscripten` toolchain: LLVM (upstream)

In order to build _libflac.js_, make sure you have _emscripten_ installed (with toolchain `LLVM/upstream`; default since version 1.39.x).

On running `make`, the build process will download the sources for the
FLAC and OGG libraries, extract them, and build the JavaScript version of libflac.

__Encoder Demo__  
Try the [Encoding Demo][14] for encoding `*.wav` files to FLAC.
Or try the [speech-to-flac][12] [demo][13] that encodes the audio stream from a microphone to FLAC.

__Decoder Demo__  
Try the [Decoding Demo][15] for decoding `*.flac` files to `*.wav` files.
_TODO_ example for decoding a FLAC audio stream (i.e. where data/size is not known beforehand).

__API Documentation__  
See [apidoc/index.html][16] for the API documentation.

----

<!-- TOC depthFrom:1 depthTo:6 withLinks:1 updateOnSave:1 orderedList:0 -->

	- [Usage](#usage)
		- [Including libflac.js](#including-libflacjs)
				- [Browser](#browser)
				- [WebWorker](#webworker)
				- [Node](#node)
				- [React](#react)
			- [Including Dynamically Loaded libflac.js](#including-dynamically-loaded-libflacjs)
			- [Including Dynamically Loaded  libflac.js from Non-Default Location](#including-dynamically-loaded-libflacjs-from-non-default-location)
		- [Library Variants](#library-variants)
				- [Default Library:](#default-library)
				- [Minified Library:](#minified-library)
				- [Development Library:](#development-library)
		- [Encoding with libflac.js](#encoding-with-libflacjs)
		- [Decoding with libflac.js](#decoding-with-libflacjs)
		- [API](#api)
	- [Building](#building)
		- [Build *nix (libflac 1.3.0)](#build-nix-libflac-130)
		- [Build Windows/VisualStudio 10 (libflac 1.3.0)](#build-windowsvisualstudio-10-libflac-130)
		- [Building *nix (libflac 1.3.2)](#building-nix-libflac-132)
		- [Prerequisite: Building *nix (libogg 1.3.4)](#prerequisite-building-nix-libogg-134)
		- [Prerequisite: Building Windows/ViusalStudio 10 (libogg 1.3.2)](#prerequisite-building-windowsviusalstudio-10-libogg-132)
		- [Change Library API](#change-library-api)
	- [Contributors](#contributors)
	- [Acknowledgments](#acknowledgments)
	- [License](#license)

<!-- /TOC -->

## Usage
------

### Including libflac.js

##### Browser
Include the library file, e.g.
```html
<script src="libflac.js" type="text/javascript"></script>
```

##### WebWorker
Import the library file, e.g.
```javascript
importScripts('libflac.js');
```

##### Node

In `Node.js`:
install with `npm`
```
npm install --save git+https://github.com/mmig/libflac.js.git
```

then, use factory method for loading one of the library variants:
```javascript

//load default/release asm.js variant:
var Flac = require('libflacjs')();

// use one of the optimization-variants:
//  * <empty> / "release"
//  * "min"
//  * "dev"
// use one of the technology-variants:
//  * <empty> / "asmjs"
//  * "wasm"
//
// can be combined with dot, e.g. "min.wasm":
var FlacFactory = require('libflacjs');
var Flac = FlacFactory('min.wasm');
Flac.on('ready', function(event){
  ...
```

##### React

For `reactjs`:
install with `npm` (see above), and `require()` the library directly, like
```javascript
var Flac = require('libflacjs/dist/libflac.js');
```


#### Including Dynamically Loaded libflac.js

Some variants of the `libflac.js` library are loaded asynchronously
(e.g. minimized/optimized variants may load a separate binary file during initialization of the library).

In this case, you have to make sure, not to use `libflac.js` before is has been completely loaded / initialized.

Code example:
```javascript

//either use Flac.on() or set handler Flac.onready:
Flac.on('ready', function(event){
  var libFlac = event.target;
  //NOTE: Flac === libFlac

  //execute code that uses libflac.js:
  someFunctionForProcessingFLAC();
};

//... or set handler
Flac.onready = function(event){
  var libFlac = event.target;
  //NOTE: Flac === libFlac

  //execute code that uses libflac.js:
  someFunctionForProcessingFLAC();
};


// IMPORTANT: if execution environment does not support Object.defineProperty
//            setting the handler will have no effect, if Flac is already ready.
//            In this case, ready-state needs be checked, and if already ready,
//            the handler-code should be triggered immediately insteady of setting
//            the handler.
if( !Flac.isReady() ){
  Flac.onready = function(event){
    var libFlac = event.target;
    //NOTE: Flac === libFlac

    //call function that uses libflac.js:
    someFunctionForProcessingFLAC();
  };
} else {

  //execute code that uses libflac.js:
  someFunctionForProcessingFLAC();
}
```

**NOTE:** If `Object.defineProperty()` is not supported in the execution environment,
         then the `onready()` handler will not be called, when the library already
         has been initialized before assigning it to `Flac.onready` (i.e. when
         `Flac.isReady()` returns `true`).
         In this case, you should check `Flac.isReady()` and provide alternative code
         execution to the `onready()` function, in case `Flac.isReady()` is `true`
         (or use `Flac.on('ready', ...)` instead).


#### Including Dynamically Loaded  libflac.js from Non-Default Location

Variants of the `libflac.js` library that are loaded asynchronously do usually also load some additional files.

If the library-file is not loaded from the default location ("page root"), but from a sub-directory/-path, you need to
let the library know, so that it searches for the additional files, that it needs to load, in that sub-directory/-path.

For this, the path/location must be stored in the global variable `FLAC_SCRIPT_LOCATION` *before* the `libflac.js`
library is loaded.
If `FLAC_SCRIPT_LOCATION` is given as `string`, it specifies the path to the `libflac.js` files (see examples below), e.g.
```javascript
//location example as string:
FLAC_SCRIPT_LOCATION = 'libs/';
```
If `FLAC_SCRIPT_LOCATION` is given as an object, it specifies mappings of the file-names to the file-paths of the `libflac.js` files (see examples below), e.g.
```javascript
//location example as object/mapping:
FLAC_SCRIPT_LOCATION = {
  'libflac.min.js.mem': 'libs/flac.mem'
};
```
Note, that the path/location should end with a slash (`"/"`), e.g. `'some/path/'`
(the library will try to automatically add a slash, if it is missing).

An example for specifying the path/location at `libs/` in an HTML file:
```html
  <script type="text/javascript">window.FLAC_SCRIPT_LOCATION = 'libs/';</script>
  <script src="libs/libflac.js" type="text/javascript"></script>
```

Or example for specifying the path/location at `libs/` in a WebWorker script:
```javascript
  self.FLAC_SCRIPT_LOCATION = 'libs/';
  importScripts('libs/libflac.js');
```

Or example for specifying the path/location at `libs/` in Node.js script:
```javascript
  process.env.FLAC_SCRIPT_LOCATION = './libs/';
  process.env.FLAC_UMD_MODE = true;//<- OPTIONAL: avoid export to global namespace
  var Flac = require('./libs/libflac.js');
```

Example for specifying custom path and file-name via mapping (`originalFileName -> <newPath/newFileName>`):  
in this case, the file-name(s) of the additionally required files (e.g. `*.mem` or `.wasm` files)
need to be mapped to the custom path/file-name(s), that is,
for all the required files of the used library variant (see details below).
```javascript
  self.FLAC_SCRIPT_LOCATION = {
    'libflac.min.js.mem': 'libs/flac.mem'
  };
  importScripts('libs/flac.min.js');
```

### Library Variants

There are multiple variants available for the library, that are compiled with different
settings for debug-output and code optimization, namely `debug`, `min`, and the
default (release) library variants.



In addition, for each of these variants, there is now a `wasm` variant (_WebAssembly_) available:
the old/default variants are compiled for `asm.js` which is "normal" JavaScript, with some
optimizations that browsers can take advantage of by specifically supporting `asm.js` (e.g. _FireFox_).

(from the [Emscripten documentation][17])
> WebAssembly is a new binary format for executing code on the web, allowing much faster start times
> (smaller download, much faster parsing in browsers)

In short, the (old) `asm.js` is backwards compatible, since it is simply JavaScript
(and browsers that specifically support it, can execute it optimized/more efficiently),
while the new `WebAssembly` format requires more recent/modern browsers, but is generally
more efficient with regard to code size and execution time.

> NOTE the `WebAssembly` variant does not create/encode "binary-perfect" FLAC files
     compared to the other library variants, or compared to the FLAC
     command-line tool.  
     More specifically, comparing the encoding results byte-by-byte with encoding
     results from the `asm.js` variants, or separately encoded data using the FLAC
     command-line tool, results are different for the `WebAssembly` variant.
     However, the reverse operation, decoding these "binary-different" FLAC
     files (using `WebAssembly`, or `asm.js` or the command-line tool) results
     in the same WAV data again.  
     _It seems, the `WebAssembly` variant chooses different frame-sizes
       while encoding; e.g. the max. frame-size may differ from when encoding
       with the `asm.js` variant or with the command-line tool._

NOTES for dynamically loaded library variants:
   * the corresponding _required_ files must be included in the same directory as the library/JavaScript file
   * the additional _required_ files file must not be renamed (or the library/JavaScript file must be edited accordingly)
   * see also the section above for handling dynamically loaded library variants, and, if appropriate, the section for
     including dynamically loaded libraries from a sub-path/location

##### Default Library:
_(see [`/dist`](dist))_
 * ASM.js Variant:
    * `libflac.js`
 * WebAssembly variant _(dynamically loaded)_:
    * `libflac.wasm.js`
    * `libflac.wasm.wasm` (**required**; will be loaded by the library)
    * `libflac.wasm.js.symbols` (optional; contains renaming information)

##### Minified Library:
_(see [`/dist`](dist))_
 * ASM.js Variant _(dynamically loaded)_:
     * `libflac.min.js`
     * `libflac.min.js.mem` (**required**; will be loaded by the library)
     * `libflac.min.js.symbols` (optional; contains renaming information)
 * WebAssembly variant _(dynamically loaded)_:
     * `libflac.min.wasm.js`
     * `libflac.min.wasm.wasm` (**required**; will be loaded by the library)
     * `libflac.min.wasm.js.symbols` (optional; contains renaming information)

##### Development Library:
_(see [`/dist`](dist))_
 * ASM.js Variant:
   * `libflac.dev.js`
   * ~~`libflac.dev.js.map` (optional; mapping to C code)~~ _currently not supported by LLVM toolchain_
   * `libflac.dev.js.symbols` (optional; contains renaming information)
 * WebAssembly variant _(dynamically loaded)_:
   * `libflac.dev.wasm.js`
   * `libflac.dev.wasm.wasm` (**required**; will be loaded by the library)
   * `libflac.dev.wasm.js.map` (optional; mapping to C code)
   * `libflac.dev.wasm.wast` (optional; plaintext of WASM code in s-expression format)



### Encoding with libflac.js

Generally, `libflac.js` supports a subset of the [libflac encoding interface][8] for encoding audio data to FLAC (no full support yet!).

Supported encoding types:
 * encode from `PCM` data all-at-once
 * encode from `PCM` data chunk-by-chunk (i.e. _streaming_)

Supported target containers:
 * native `FLAC` container
 * `OGG` transport container

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
    BLOCK_SIZE = 0,
    flac_ok = 1,
    USE_OGG = false;


////////
// [1] INIT -> IN: config { ... }

//overwrite default configuration from config object
COMPRESSION = config.compression;
BPS = config.bps;
SAMPLERATE = config.samplerate;
CHANNELS = config.channels;
VERIFY = config.isVerify;//verification can be disabled for speeding up encoding process
BLOCK_SIZE = config.blockSize;
USE_OGG = config.useOgg;

//init encoder
flac_encoder = Flac.create_libflac_encoder(SAMPLERATE, CHANNELS, BPS, COMPRESSION, 0, VERIFY, BLOCK_SIZE);

if (flac_encoder == 0){
  return;
}

var encBuffer = [];
var status_encoder;
if(!USE_OGG){
  // encode to native FLAC container
  status_encoder = Flac.init_encoder_stream(flac_encoder, function(encodedData /*Uint8Array*/, bytes, samples, current_frame){
    //store all encoded data "pieces" into a buffer
    encBuffer.push(encodedData);
  });
} else {
  // encode to OGG container
  status_encoder = Flac.init_encoder_ogg_stream(flac_encoder, function(encodedData /*Uint8Array*/, bytes, samples, current_frame){
    //store all encoded data "pieces" into a buffer
    encBuffer.push(encodedData);
  });
}
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

Supported encoding types:
 * decode from `FLAC` data to `PCM` data all-at-once
 * decode from `FLAC` data to `PCM` chunk-by-chunk (i.e. _streaming_)

Supported source containers:
 * native `FLAC` container
 * `OGG` transport container


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
  USE_OGG = false,
  meta_data;



////////
// [1] INIT -> IN: config { ... }
//             IN: flacData Uint8Array (FLAC data)

//overwrite default configuration from config object
VERIFY = config.isVerify;//verification can be disabled for speeding up decoding process


// init decoder
var flac_decoder = Flac.create_libflac_decoder(VERIFY);

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

function error_callback_fn(err, errMsg, client_data){
    console.error('decode error callback', err, errMsg);
}

function metadata_callback_fn(data){
  // data -> [example] {
  //  min_blocksize: 4096,
  //  max_blocksize: 4096,
  //  min_framesize: 14,
  //  max_framesize: 5408,
  //  sampleRate: 44100,
  //  channels: 2,
  //  bitsPerSample: 16,
  //  total_samples: 267776,
  //  md5sum: "50d4d469448e5ea75eb44ab6b7f111f4"
  //}
  console.info('meta data: ', data);
}

var flac_ok = 1;
var status_decoder;
if(!USE_OGG){
  // decode from native FLAC container
  status_decoder = Flac.init_decoder_stream(
    flac_decoder,
    read_callback_fn, write_callback_fn,     //required callbacks
    error_callback_fn, metadata_callback_fn  //optional callbacks
  );
} else {
  // decode from OGG container
  status_decoder = Flac.init_decoder_ogg_stream(
    flac_decoder,
    read_callback_fn, write_callback_fn,     //required callbacks
    error_callback_fn, metadata_callback_fn  //optional callbacks
  );
}
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

  // VARIANT 1: decode chunks of flac data, one-by-one

  //request to decode data chunks until end-of-stream is reached:
  while(state <= 3 && flac_return != false){

    flac_return &= Flac.FLAC__stream_decoder_process_single(flac_decoder);
    state = Flac.FLAC__stream_decoder_get_state(flac_decoder);
  }

  flac_ok &= flac_return != false;

} else if(mode == 'v2'){

  // VARIANT 2: decode complete data stream, all-at-once
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

### Prerequisite: Building *nix (libogg 1.3.4)

Include libogg in libflac built by specifying

    --with-ogg=<libogg dir>

for libfalc's `./congiure` process (where `<libogg dir>` is the _absolute_ path
to the libogg directory)

Note that libflac build process expects the libogg headers at

    <libogg dir>/include/**

and the compiled library at

    <libogg dir>/lib/**

if necessary you can create symbolic links for these, that link to the
actual location, e.g.

    ln -sfn src/.libs lib
    ln -sfn include/ogg ogg

### Prerequisite: Building Windows/ViusalStudio 10 (libogg 1.3.2)

__*EXPERIMENTAL*__

Build libogg for target platform `Emscripten`, and follow libflac's README
for coyping the header files.

In libfalc's build configuration (`Emcc Linker -> Input -> Additional Dependencies`),
explicitly link the additional dependencies
`framing.o` and `bitwise.o` from the libogg's built, something like

    ..\..\..\libogg-1.3.2\win32\VS2010\Emscripten\Release\framing.o;..\..\..\libogg-1.3.2\win32\VS2010\Emscripten\Release\bitwise.o

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

IMPORTANT: the helper script extracts function names that are invoked by `Module.ccall()`
           or `Module.cwrap()`.
           If invoked dynamically (i.e. use variable instead of string), add a DEV comment
           where the function is explicitly stated as string, e.g.
           ```javascript
           //  Module.ccall('FLAC__stream_decoder_init_stream'
           //  Module.ccall('FLAC__stream_decoder_init_ogg_stream'
           var func_name = test? 'FLAC__stream_decoder_init_stream' : 'FLAC__stream_decoder_init_ogg_stream';
          Module.ccall(
            func_name,
           ```


## Contributors
------

See `CONTRIBUTORS` for list of contributors.

## Acknowledgments
------

This project was inspired by Krennmair's [libmp3lame-js][5] project for [JS mp3][5] encoding.


## License
-------

libflac.js is compiled from the reference implementation of FLAC (BSD license);
the additional resources and wrapper-code of this project is published under the MIT license (see file LICENSE).


[1]: https://github.com/kripken/emscripten
[2]: https://kripken.github.io/emscripten-site
[3]: https://kripken.github.io/emscripten-site/docs
[4]: https://kripken.github.io/emscripten-site/docs/getting_started/getting_started_with_emscripten_and_vs2010.html
[5]: https://github.com/akrennmair/libmp3lame-js
[6]: https://xiph.org/flac/
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
[17]: http://kripken.github.io/emscripten-site/docs/compiling/WebAssembly.html#webassembly
[18]: https://xiph.org/ogg/
