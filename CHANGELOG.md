
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
