
# Version 5.3.0

 * FIX incorrect API documentation: error-callback for decoder is not optional
   ```
   init_decoder_stream(decoder, read_callback_fn, write_callback_fn, error_callback_fn, ...)
   ```

 * exposed additional library functions:
   * `FLAC__stream_decoder_get_md5_checking(decoder, boolean)`
   * `FLAC__stream_encoder_get_verify_decoder_state(encoder)`
   * `FLAC__stream_encoder_get_verify(encoder)`

 * added support for non-interleaved encoding method:  
   `FLAC__stream_encoder_process(encoder, channelBuffers, numberOfSamples)`

 * added `variant` property when using library factory method, i.e. when running in `node`:
   do add property `variant` to returned instance for indicating which library variant is returned

 * disabled generated code for `node` that would catch uncaught exceptions and promises:
   these should be handled by application code instead of the library

 * improved typings


# Version 5.2.1

 * examples: added example code for reading/encoding 8-bit and 24-bit WAV data

# Version 5.2.0

 * added emitting of life cycle events when encoder or decoder instances are created and destroyed
   * e.g.
     ```
     Flac.on('created', function(evt){
       console.log('created '+evt.target.type+' with id '+evt.target.id)
     });
     ```
 * added experimental support for getting metadata for subframes (in decoding write callback); needs to be explicitly enabled (see `Flac.setOptions()`)
 * added functions `Flac.setOptions(p_coder, options)` and `Flac.getOptions(p_coder)`:  
   set additional encoding/decoding options
   * supported options:
     * `analyseSubframes`: for decoding: include subframes metadata in write-callback metadata, DEFAULT: `false`
     * `analyseResiduals`: for decoding: include residual data in subframes metadata in write-callback metadata (`analyseSubframes` must also be enabled), DEFAULT: `false`
 * FIX decoding for standard bit depth values 8 and 24
 * recompiled with `emscripten` v1.39.18 (llvm toolchain)
 * improved generation for typings/documentation

# Version 5.2.0-beta.1

 * extended interface for encoding write callback `encoder_write_callback_fn(..)`:  
   if returns `false`, encoding will be aborted (any other or no value returned will continue encoding)
 * compile based on `libFLAC` v1.3.3
 * recompiled with `emscripten` v1.39.11 (llvm toolchain)
 * BUGFIX for decoding: handle padded 24-bit samples correctly

# Version 5.1.1

 * provide specific typings for function type definitions

# Version 5.1.0

 * [BREAKING CHANGE] removed support for exporting library to global namespace *when loaded as module*, that is, in case it is loaded as AMD or CommonJS module
   * if the library should sill be available when loaded as module, this needs to be done this manually now,
     e.g. if require'd as flacModule (in browser):
     ```
     window.Flac = flacModule;
     ```
     or (in node):
     ```
     global.Flac = flacModule;
     ```
   * consequently, support for enviornment flag ~~`FLAC_UMD_MODE`~~ was dropped, e.g. using
     `process.env.FLAC_UMD_MODE = true;` or `process.env.FLAC_UMD_MODE = false;` will have no effect any more
 * improved compatibility with `webpack`:
   simplified UMD wrapper so that `webpack` may detect AMD loading correctly
 * added typings for `TypeScript`
 * improved API documentation
 * recompiled with `emscripten` v1.39.3 (llvm toolchain)

# Version 5.0.0

 * added support for OGG streams
 * upgraded to emscripten 1.39.3 for compiling
 * use new emscripten default toolchain LLVM/upstream

## IMPORTANT: Changed File Names & Directory Structure

Starting with version 5.0.0, this library is available as NPM managed package.

Before this, the library targeted non-managed browser projects, meaning that
for the main usage it was expected that the library was included as (manually copied)
resources in web projects. For this reason, it included version information in the
compiled library's name.

Now version information is included in the NPM package itself, and version information
in the compiled library's name is not useful anymore.  
In addition, inclusion/usage by other projects is managed via NPM, thus rendering
sub-directories for the different library variants obsolete.

For this reason, starting with this version, the library variants' file names
do not include version information anymore, and are organized in a flat directory
structure.

```
dist/libflac4-1.3.2xxx           ->  dist/libflac.xxx

dist/min/libflac4-1.3.2.min.xxx  ->  dist/libflac.min.xxx

dist/dev/libflac4-1.3.2.dev.xxx  ->  dist/libflac.dev.xxx
```

# Version 4.x

library primarily targeted browser platform


# Legacy Build Instructions

## Legacy Build Instructions for Windows

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

### Prerequisite: Building Windows/ViusalStudio 10 (libogg 1.3.2)

__*EXPERIMENTAL*__

Build libogg for target platform `Emscripten`, and follow libflac's README
for coyping the header files.

In libfalc's build configuration (`Emcc Linker -> Input -> Additional Dependencies`),
explicitly link the additional dependencies
`framing.o` and `bitwise.o` from the libogg's built, something like

    ..\..\..\libogg-1.3.2\win32\VS2010\Emscripten\Release\framing.o;..\..\..\libogg-1.3.2\win32\VS2010\Emscripten\Release\bitwise.o


## Legacy Build Instructions for *nix

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
