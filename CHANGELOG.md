
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
In addition, incluse/usage by other projects is managed via NPM, thus rendering
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
