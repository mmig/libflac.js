libflac.js
==========

[![npm](https://img.shields.io/npm/v/libflacjs)](https://www.npmjs.com/package/libflacjs)
![GitHub package.json version](https://img.shields.io/github/package-json/v/mmig/libflac.js/master)
[![GitHub tag (latest SemVer)](https://img.shields.io/github/v/tag/emscripten-core/emscripten?color=green&label=emscripten%40latest)][1]
[![libFLAC version](https://img.shields.io/badge/libFLAC-1.3.3-yellow)][6]
[![libogg version](https://img.shields.io/badge/libogg-1.3.4-yellow)][18]

[FLAC][6] data stream encoder and decoder compiled in JavaScript using _emscripten_.

__Features__  
 * available as pure JavaScript, JavaScript+_binary_, JavaScript+WASM
 * encode/decode data all-at-once (~ _file_) or chunk-by-chunk (~ _stream_)
 * supported container formats: native FLAC container (`*.flac`), OGG container (`*.ogg`)

For immediate use, the `/dist` sub-directory contains the compiled
files for the `libflac.js` JavaScript library, as well as a minified version.

> Complied from `libFLAC` (static `C` library) version: 1.3.3\
> Used library `libogg` (static `C` library) version: 1.3.4\
> Used compiler `Emscripten` version: 1.39.18\
> Used compiler `Emscripten` toolchain: LLVM (upstream)

In order to build _libflac.js_, make sure you have _emscripten_ installed (with toolchain `LLVM/upstream`; default since version 1.39.x).

On running `make`, the build process will download the sources for the
FLAC and OGG libraries, extract them, and build the JavaScript version of libflac.

----
> __IMPORTANT__ changes for version `5.x`: simplified naming scheme and library location!  
> * removed version information from library file names, e.g.  
>   `libflac4-1.3.2.min.js -> libflac.min.js`
> * moved all library files directly into `dist/`, i.e. there are _no_ sub-directories `dist/min/` and `dist/dev/` anymore
----


__Encoder Demo__  
Try the [Encoding Demo][14] for encoding `*.wav` files to FLAC.
Or try the [speech-to-flac][12] [demo][13] that encodes the audio stream from a microphone to FLAC.

__Decoder Demo__  
Try the [Decoding Demo][15] for decoding `*.flac` files to `*.wav` files.
_TODO_ example for decoding a FLAC audio stream (i.e. where data/size is not known beforehand).

__API Documentation__  
See [doc/index.html][16] for the API documentation.

----

<!-- TOC depthFrom:1 depthTo:6 withLinks:1 updateOnSave:0 orderedList:0 -->

- [Usage](#usage)
	- [Including libflac.js](#including-libflacjs)
		- [Browser](#browser)
		- [WebWorker](#webworker)
		- [Node](#node)
		- [React/webpack](#reactwebpack)
		- [Angular/webpack](#angularwebpack)
		- [WebWorker with webpack](#webworker-with-webpack)
	- [Async Initialization](#async-initialization)
		- [Including Dynamically Loaded libflac.js from Non-Default Location](#including-dynamically-loaded-libflacjs-from-non-default-location)
	- [Library Variants](#library-variants)
		- [_default_ vs `min` vs `dev`](#default-vs-min-vs-dev)
		- [`asm.js` vs `WASM`](#asmjs-vs-wasm)
		- [Example `WASM` Feature Detection](#example-wasm-feature-detection)
		- [Variants and Notes](#variants-and-notes)
		- [Default Library:](#default-library)
		- [Minified Library:](#minified-library)
		- [Development Library:](#development-library)
	- [Encoding with libflac.js](#encoding-with-libflacjs)
	- [Decoding with libflac.js](#decoding-with-libflacjs)
	- [API](#api)
- [Building](#building)
	- [Build *nix (libflac 1.3.0 or later)](#build-nix-libflac-130-or-later)
	- [Build Windows/VisualStudio 10 (libflac 1.3.0)](#build-windowsvisualstudio-10-libflac-130)
	- [Building *nix (libflac 1.3.2)](#building-nix-libflac-132)
	- [Building *nix (libflac 1.3.3)](#building-nix-libflac-133)
	- [Prerequisite: Building *nix (libogg 1.3.4)](#prerequisite-building-nix-libogg-134)
	- [Prerequisite: Building Windows/ViusalStudio 10 (libogg 1.3.2)](#prerequisite-building-windowsviusalstudio-10-libogg-132)
	- [Changing The Library API](#changing-the-library-api)
- [Contributors](#contributors)
- [Acknowledgments](#acknowledgments)
- [License](#license)

<!-- /TOC -->

## Usage
------

### Including libflac.js

#### Browser
Include the library file, e.g.
```html
<script src="libflac.js" type="text/javascript"></script>
```

#### WebWorker
Import the library file, e.g.
```javascript
importScripts('libflac.js');
```

#### Node

In `Node.js`:
install with `npm`
```bash
 # install from npm
npm install --save libflacjs

 # install latest from master branch
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

#### React/webpack

For `reactjs`:
install with `npm` (see above), and `require()` the library file directly, like
```javascript
// for example:
var Flac = require('libflacjs/dist/libflac.js');
// or
var Flac = require('libflacjs/dist/libflac.wasm.js');
```

> NOTE `min` and `wasm` variants will most likely require
>   additional configuration of the build system, see also
>   section about `webpack` integration


#### Angular/webpack

For `Angular` (`TypeScript`):
install with `npm` (see above), and `import` the library file directly, like
```typescript
// for example:
import * as Flac from 'libflacjs/dist/libflac';
// or
import * as Flac from 'libflacjs/dist/libflac.wasm';
```

__NOTE__ unfortunately, current typings do not allow to set `Flac.onready` when imported this way.
   This limitation can be worked around by casting to `any`, i.e.
   ```typescript
   (Flac.onready as any) = (evt: Flac.ReadyEvent) => console.log('Flac is ready now: ', evt.target);
   ```
   Or use `Flac.on('ready', ...` instead, or import with `require` statement, e.g. like
   ```typescript
   import * as FlacModule from 'libflacjs/dist/index.d';//import declaration file for typings

   declare var require: Function;//NOTE most likely, the require function needs to be explicitly declared, if other envorinments than node are targeted

   const Flac: typeof FlacModule = require('libflacjs/dist/libflac.js');
   ```

> NOTE `min` and `wasm` variants will most likely require
>   additional configuration of the build system, see also
>   section about `webpack` integration

#### WebWorker with webpack

When using `libflac.js` from a WebWorker in a `webpack` project, the `worker-loader` plugin is required, e.g. install with
```bash
npm install --save-dev worker-loader
```

Then include a rule in the `webpack` configuration, so that the file with the `WebWorker` implementation will be built as a seperate script:  
in the `module.rules` array add an entry, e.g. if the file name is `flacworker.js` something similar to
```javascript
{
  //this must match the file-name of the worker script:
  test:  /\bflacworker\.js$/i,
  use: {
    loader: 'worker-loader',
    options: { name: 'worker-[name].[hash].js' }
  }
},
```


If in addition a library variant with binary files (e.g. _min_ variant wiht `*.mem` files or _wasm_ variant with `*.wasm` files) is targeted,
then in addition the `file-loader` plugin for `webpack` is required, e.g. install with
```
npm install --save-dev file-loader
```

Then include a rule in the `webpack` configuration, so that the file with the binary files will be included with the correct file names that `libflac.js` expects:  
in the `module.rules` array add an entry, e.g. if the file name is `flacworker.js` something similar to
```javascript
{
  test: /\.(wasm|mem)$/i,
  use: {
    loader: 'file-loader',
    options: {
      //NOTE binary file must be included with its original file name,
      //     so that libflac.js lib can find it:
      name: function(file) {
        return path.basename(file)
      }
    }
  },
},
```
_Alterantively to using the exact file name of the binary files, `FLAC_SCRIPT_LOCATION` could be configured to use the file name generated by `file-loader` plugin, see details below for configuring `FLAC_SCRIPT_LOCATION`_



Then for creating the WebWorker instance use something like
```javascript
// var flacWorker = new Worker('flacworker.js'); //<- normal way to create a WebWorker instance
var flacWorker = require('./flacworker.js')();   //<- create a WebWorker instance with webpack worker-loader plugin

flacWorker.onmessage = function(event) {
 console.log('received message from flacWorker ', event.data);
}

flacWorker.postMessage(...
```

In the WebWorker script itself, do load the `libflac.js` library like
```javascript
//importScripts('libflac.js');//<- normal way to load a script within a WebWorker

// for including a "single file variant" of libflac.js, e.g. the standard version:
var Flac = require('libflacjs/dist/libflac.js');

// OR for including a .wasm variant, e.g standard-wasm (for binary of min-version include its *.mem file):
require.resolve('libflacjs/dist/libflac.wasm.wasm') // <- force webpack to include the binary file
var Flac = require('libflacjs/dist/libflac.wasm.js')

self.onmessage = function(event) {
 console.log('received message from main thread ', event.data);
}
```


### Async Initialization

Including dynamically loaded `libflac.js`:

Some variants of the `libflac.js` library are loaded asynchronously
(e.g. minimized/optimized variants may load a separate binary file during initialization of the library).

In this case, you have to make sure, not to use `libflac.js` before it has been completely loaded / initialized.

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
//            In this case, ready-state needs to be checked, and if already ready,
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


#### Including Dynamically Loaded libflac.js from Non-Default Location

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
  var Flac = require('./libs/libflac.js');
```

> NOTE: setting `FLAC_UMD_MODE` has no effect since v5.0.1:
>   automatic export to global namespace has been dropped in case of loading as AMD or CommonJS module,
>   i.e. setting `process.env.FLAC_UMD_MODE = true` when running in Node.js will have no effect anymore,
>   instead set manually, e.g. with `global.Flac = require('libflacjs')`.

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

#### _default_ vs `min` vs `dev`

There are multiple variants available for the library, that are compiled with different
settings for debug-output and code optimization, namely `debug`, `min`, and the
default (release) library variants.

#### `asm.js` vs `WASM`

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

#### Example `WASM` Feature Detection

simple detection of `WASM` support in browser:
```javascript
var Flac;
if(typeof WebAssembly === 'object' && WebAssembly){
  //load wasm-based library
  Flac = require('libflac.min.wasm.js');
  //or, for example, in worker script: importScripts('libflac.min.wasm.js');
} else {
  //load asm.js-based library
  Flac = require('libflac.min.js');
  //or, for example, in worker script: importScripts('libflac.min.js');
}
```

#### Variants and Notes

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

#### Default Library:
_(see [`/dist`](dist))_
 * ASM.js Variant:
    * `libflac.js`
 * WebAssembly variant _(dynamically loaded)_:
    * `libflac.wasm.js`
    * `libflac.wasm.wasm` (**required**; will be loaded by the library)
    * `libflac.wasm.js.symbols` (optional; contains renaming information)

#### Minified Library:
_(see [`/dist`](dist))_
 * ASM.js Variant _(dynamically loaded)_:
     * `libflac.min.js`
     * `libflac.min.js.mem` (**required**; will be loaded by the library)
     * `libflac.min.js.symbols` (optional; contains renaming information)
 * WebAssembly variant _(dynamically loaded)_:
     * `libflac.min.wasm.js`
     * `libflac.min.wasm.wasm` (**required**; will be loaded by the library)
     * `libflac.min.wasm.js.symbols` (optional; contains renaming information)

#### Development Library:
_(see [`/dist`](dist))_
 * ASM.js Variant:
   * `libflac.dev.js`
   * ~~`libflac.dev.js.map` (optional; mapping to C code)~~ _currently not supported by LLVM toolchain_
   * `libflac.dev.js.symbols` (optional; contains renaming information)
 * WebAssembly variant _(dynamically loaded)_:
   * `libflac.dev.wasm.js`
   * `libflac.dev.wasm.wasm` (**required**; will be loaded by the library)
   * `libflac.dev.wasm.js.map` (optional; mapping to C code)


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

Basic steps for encoding:
 1. create encoder
   * specify encoding parameters, like channels, sampling rate, compression level etc.
 2. initialize encoder
   * for native FLAC container or OGG container
   * specify write callback and/or other optional callback(s)
 3. encode data (chunks)
 4. finish encoding
 5. delete encoder

Small usage example:
```javascript

//prerequisite: loaded libflac.js & available via variable Flac

var flac_encoder,
    CHANNELS = 1,
    SAMPLERATE = 44100,
    COMPRESSION = 5,
    BPS = 16,
    VERIFY = false,
    BLOCK_SIZE = 0,
    flac_ok = 1,
    USE_OGG = false;


////////
// [1] CREATE -> IN param: config { ... } (encoding parameters)

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

////////
// [2] INIT -> OUT: encBuffer (encoded data), metaData (OPTIONALLY, FLAC metadata)

//for storing the encoded FLAC data
var encBuffer = [];
//for storing the encoding FLAC metadata summary
var metaData;

// [2] (a) setup writing (encoded) output data

var write_callback_fn = function(encodedData /*Uint8Array*/, bytes, samples, current_frame){
  //store all encoded data "pieces" into a buffer
  encBuffer.push(encodedData);
};

// [2] (b) optional callback for receiving metadata

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
  metaData = data;
}

// [2] (c) initialize to either write to native-FALC or to OGG container

var status_encoder;
if(!USE_OGG){
  // encode to native FLAC container
  status_encoder = Flac.init_encoder_stream(flac_encoder,
    write_callback_fn,    //required callback(s)
    metadata_callback_fn  //optional callback(s)
  );
} else {
  // encode to OGG container
  status_encoder = Flac.init_encoder_ogg_stream(flac_encoder,
    write_callback_fn,    //required callback(s)
    metadata_callback_fn  //optional callback(s)
  );
}
flac_ok &= (status_encoder == 0);


////////
// [3] ENCODE -> IN: for this example, a PCM Float32 audio, single channel (mono) stream
//                   buffer (Float32Array)
// ... repeat encoding step [3] as often as necessary

//convert input data to signed int data, in correspondence to the bps setting (i.e. in this case int32)
// see API docs on FLAC__stream_encoder_process_interleaved() for more details
var buf_length = buffer.length;
var buffer_i32 = new Int32Array(buf_length);
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

// encoding mode: either interleaved samples or array of channel-samples
var mode = 'interleaved';// "interleaved" | "channels"

// do encode the audio data ...
var flac_return;
if(mode === 'interleaved'){

  //VARIANT 1: encode interleaved channels: TypedArray -> [ch1_sample1, ch2_sample1, ch1_sample1, ch2_sample2, ch2_sample3, ...

  flac_return = Flac.FLAC__stream_encoder_process_interleaved(flac_encoder, buffer_i32, buf_length);

} else {

  //VARIANT 2: encode channels array: TypedArray[] -> [ [ch1_sample1, ch1_sample2, ch1_sample3, ...], [ch2_sample1, ch2_sample2, ch2_sample3, ...], ...]

  //code example for splitting an interleaved Int32Array into its channels:
  var ch_buf_i32 = new Array(CHANNELS).fill(null).map(function(){ return new Uint32Array(buf_length/CHANNELS); });
  for(var i=0; i < buf_length; i += CHANNELS){
    for(var j=0; j < CHANNELS; ++j){
      ch_buf_i32[j][i / CHANNELS] = buffer_i32[i + j];
    }
  }

  // ... encode the array of channel-data:
  flac_return = Flac.FLAC__stream_encoder_process(flac_encoder, ch_buf_i32, buf_length / CHANNELS);
}


////////
// [4] FINISH ENCODING

flac_ok &= Flac.FLAC__stream_encoder_finish(flac_encoder);
console.log("flac finish: " + flac_ok);


////////
// [5] DESTROY: delete encoder

//after usage: free up all resources for the encoder
Flac.FLAC__stream_encoder_delete(flac_encoder);

////////
// [6] ... do something with the encoded data, e.g.
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


Basic steps for decoding:
 1. create decoder
   * specify if checksum verification should be processed
 2. initialize decoder
   * specify if source is native FLAC container or OGG container
   * specify read and write callback and/or other optional callback(s)
 3. start decoding data (chunks)
 4. finish decoding
 5. delete decoder

Small usage example:
```javascript

//prerequisite: loaded libflac.js & available via variable Flac

var VERIFY = true,
  USE_OGG = false;


////////
// [1] CREATE -> IN: config { ... } (decoding parameters)

//overwrite default configuration from config object
VERIFY = config.isVerify;//verification can be disabled for speeding up decoding process

//decode from native FLAC container or from OGG container
USE_OGG = config.isOgg;

// create decoder
var flac_decoder = Flac.create_libflac_decoder(VERIFY);

if (flac_decoder == 0){
  return;
}


////////
// [2] INIT -> OUT: decBuffer (decoded data), metaData (OPTIONALLY, FLAC metadata)
//             IN: flacData Uint8Array (FLAC data)

// [2] (a) setup reading input data
var currentDataOffset = 0;
var size = flacData.buffer.byteLength;

//function that will be called for reading the input (FLAC) data:
function read_callback_fn(bufferSize){

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


// [2] (b) setup writing (decoded) output data

//for "buffering" the decoded data:
var decBuffer = [];
//for storing the decoded FLAC metadata
var metaData;

//function that will be called for decoded output data (WAV audio)
function write_callback_fn(channelsBuffer, frameHeader){
  // channelsBuffer is an Array of the decoded audio data (Uint8Array):
  // the length of array corresponds to the channels, i.e. there is an Uint8Array for each channel

  // frameHeader -> [example] {
  //   bitsPerSample: 8
  //   blocksize: 4096
  //   channelAssignment: 0
  //   channels: 2
  //   crc: 0
  //   number: 204800
  //   numberType: "samples"
  //   sampleRate: 44100
  //   subframes: undefined // -> needs to be enabled via
  //                       //     Flac.setOptions(flac_decoder, {analyseSubframes: true})
  //                       // -> see API documentation
  //}

  decBuffer.push(channelsBuffer);
}

// [2] (c) optional callbacks for receiving details about errors and/or metadata

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
  metaData = data;
}

// [2] (d) intialize for reading from native-FLAC or from OGG container
var flac_ok = 1;
var status_decoder;
if(!USE_OGG){
  // decode from native FLAC container
  status_decoder = Flac.init_decoder_stream(
    flac_decoder,
    read_callback_fn, write_callback_fn,     //required callback(s)
    error_callback_fn, metadata_callback_fn  //optional callback(s)
  );
} else {
  // decode from OGG container
  status_decoder = Flac.init_decoder_ogg_stream(
    flac_decoder,
    read_callback_fn, write_callback_fn,     //required callback(s)
    error_callback_fn, metadata_callback_fn  //optional callback(s)
  );
}
flac_ok &= status_decoder == 0;

if(flac_ok != 1){
  return;
}

////////
// [3] DECODE -> IN: FLAC audio data (see above, the read-callack)
// ... repeat encoding step [3] as often as necessary

// example for chunk-by-chunk (stream mode) or all-at-once decoding (file mode)
var mode = 'stream';// 'stream' | 'file'

var state = 0;
var flac_return = 1;

if(mode == 'stream'){

  // VARIANT 1: decode chunks of flac data, one-by-one

  //request to decode data chunks until end-of-stream is reached:
  while(state <= 3 && flac_return != false){

    flac_return &= Flac.FLAC__stream_decoder_process_single(flac_decoder);
    state = Flac.FLAC__stream_decoder_get_state(flac_decoder);
  }

  flac_ok &= flac_return != false;

} else if(mode == 'file'){

  // VARIANT 2: decode complete data stream, all-at-once
  flac_return &= Flac.FLAC__stream_decoder_process_until_end_of_stream(flac_decoder);

  //optionally: retrieve status
  state = Flac.FLAC__stream_decoder_get_state(flac_decoder);
}


if (flac_return != true){
  return;
}

////////
// [4] FINISH DECODING

// finish Decoding
flac_ok &= Flac.FLAC__stream_decoder_finish(flac_decoder);

////////
// [5] DESTROY: delete dencoder
// alternatively reset the decoder, and then re-initialize for re-using the decoder instance

//after usage: free up all resources for the decoder
Flac.FLAC__stream_decoder_delete(flac_decoder);

////////
// [6] ... do something with the decoded data, e.g.
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

### Build *nix (libflac 1.3.0 or later)

If necessary, activate the appropriate `emscripten` toolchain (e.g. `llvm` or the older `fastcomp` toolchain; default is `llvm`)
```bash
 # list versions
emsdk list

 # activate a specific version with llvm toolchain
 # NOTE update Makefile if necessary with selected toolchain
 #   TOOL_CHAIN:=$(TOOL_CHAIN_LLVM)
emsdk activate <version>


 # activate a specific version with fastcomp toolchain
 # NOTE update Makefile if necessary with selected toolchain
 #   TOOL_CHAIN:=$(TOOL_CHAIN_FASTCOMP)
emsdk activate <version>-fastcomp
```

> NOTE when activating a toolchain, `emsdk` will print some information on how to set the correct enviornment variables, e.g.
> ```
>   ...
>   To conveniently access the selected set of tools from the command line,
>   consider adding the following directories to PATH,
>   or call 'source <path>/emsc/emsdk_env.sh' to do this for you.
>   ...
> ```
> _even when not changing a toolset via `emsdk activate ...` you may need to update/export
> the variables for the emsdk toolchain_


Start build process by executing the `Makefile`:
```bash
make
```
(build process was tested on Unbuntu 18.04)


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

__NOTE:__ these changes are not neccessary anymore since `libflac.js` version 5.x, due to use of new `emscripten` toolchain

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


### Building *nix (libflac 1.3.3)

No additional changes are neccessary anymore since `libflac.js` version 5.x, due to use of new `emscripten` toolchain

See general instrucitions in section _Building *nix (libflac 1.3.0 and later)_.


### Prerequisite: Building *nix (libogg 1.3.4)

__NOTE:__ these changes are not neccessary anymore since `libflac.js` version 5.x, due to use of new `emscripten` toolchain

Include libogg in libflac built by specifying

    --with-ogg=<libogg dir>

for libfalc's `./conigure` process (where `<libogg dir>` is the _absolute_ path
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

### Changing The Library API

The API for _libflac.js_ (e.g. exported functions) are mainly specified in `libflac_post.js`.

Functions that will be exported/used from the native `libflac` implementation need to be declared in
the compile option `-s EXPORTED_FUNCTIONS='[...]'` (see variable `EMCC_OPTS:=...` in `Makefile`);
note, when manually editing `EXPORTED_FUNCTIONS`, that the function-names must be prefixed with `_`, i.e. for
function `the_function`, the string for the exported function would be `_the_function`.

There is a [helper script](tools/extract_EXPORTED_FUNCTIONS.js) that will try to extract the compile option from `libflac_post.js` (i.e. the list of functions that need to be declared).
Run the script with `Node.js` in `tools/` (and copy&paste the output value):
```
cd tools
node extract_EXPORTED_FUNCTIONS.js
```

IMPORTANT: the helper script extracts function names that are invoked by `Module.ccall()`
          or `Module.cwrap()`.
          If invoked dynamically (i.e. use of variable instead of string), add a DEV comment
          where the function is explicitly stated as string, e.g.
```javascript
//DEV comment for exported-functions script:
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
[16]: https://mmig.github.io/libflac.js/doc/
[17]: http://kripken.github.io/emscripten-site/docs/compiling/WebAssembly.html#webassembly
[18]: https://xiph.org/ogg/
