
# for compiling/code-generation with emscripten LLVM toolchain (DEFAULT):
TOOL_CHAIN_LLVM:=llvm
# for compiling/code-generation with emscripten fastcomp toolchain:
TOOL_CHAIN_FASTCOMP:=fastcomp
# set emscripten toolchain:
# NOTE switch toolchains via emsdk activate <version>[-fastcomp]
TOOL_CHAIN:=$(TOOL_CHAIN_LLVM)

EMCC:=emcc
EMCC_DEF_OPT_LEVEL:=-O1
EMCC_MAX_OPT_LEVEL:=-O0
EMCC_MAX_OPT_LEVEL_ASMJS_FASTCOMP:=$(EMCC_MAX_OPT_LEVEL) -g4
EMCC_MAX_OPT_LEVEL_ASMJS_LLVM:=$(EMCC_MAX_OPT_LEVEL) -g3
EMCC_MAX_OPT_LEVEL_WASM:=$(EMCC_MAX_OPT_LEVEL) -g4
EMCC_MIN_OPT_LEVEL:=-O3
EMCC_OPTS_GENERAL:=--emit-symbol-map -s USE_OGG=1 -s NO_EXIT_RUNTIME=1 -s NODEJS_CATCH_EXIT=0 -s NODEJS_CATCH_REJECTION=0 -s RESERVED_FUNCTION_POINTERS=5 -s ALLOW_MEMORY_GROWTH=1 -s 'EXTRA_EXPORTED_RUNTIME_METHODS=["ccall","cwrap","getValue","setValue"]' -s EXPORTED_FUNCTIONS='["_FLAC__stream_encoder_set_verify","_FLAC__stream_encoder_get_verify","_FLAC__stream_encoder_get_verify_decoder_state","_FLAC__stream_encoder_set_compression_level","_FLAC__stream_encoder_set_blocksize","_FLAC__stream_encoder_new","_FLAC__stream_encoder_set_channels","_FLAC__stream_encoder_set_bits_per_sample","_FLAC__stream_encoder_set_sample_rate","_FLAC__stream_encoder_set_total_samples_estimate","_FLAC__stream_decoder_new","_FLAC__stream_decoder_set_md5_checking","_FLAC__stream_encoder_init_stream","_FLAC__stream_encoder_init_ogg_stream","_FLAC__stream_encoder_set_ogg_serial_number","_FLAC__stream_decoder_set_ogg_serial_number","_FLAC__stream_decoder_init_stream","_FLAC__stream_decoder_init_ogg_stream","_FLAC__stream_encoder_process","_FLAC__stream_encoder_process_interleaved","_FLAC__stream_decoder_process_single","_FLAC__stream_decoder_process_until_end_of_stream","_FLAC__stream_decoder_process_until_end_of_metadata","_FLAC__stream_decoder_get_state","_FLAC__stream_encoder_get_state","_FLAC__stream_decoder_get_md5_checking","_FLAC__stream_encoder_finish","_FLAC__stream_decoder_finish","_FLAC__stream_decoder_reset","_FLAC__stream_encoder_delete","_FLAC__stream_decoder_delete"]'
EMCC_OPTS_ASMJS_DEFAULT:=$(EMCC_OPTS_GENERAL) -s WASM=0
EMCC_OPTS_WASM_LLVM:=-s "-mnontrapping-fptoint"
EMCC_OPTS_WASM_FASTCOMP:=-s "BINARYEN_TRAP_MODE='clamp'"
EMCONFIGURE:=emconfigure
EMMAKE:=emmake
TAR:=tar
XZ:=xz

# toolchain dependent options
ifneq ($(TOOL_CHAIN),fastcomp)
EMCC_MAX_OPT_LEVEL_ASMJS:=$(EMCC_MAX_OPT_LEVEL_ASMJS_LLVM)
EMCC_OPTS_WASM_DEFAULT:=$(EMCC_OPTS_GENERAL) -s WASM=1 $(EMCC_OPTS_WASM_LLVM)
else
EMCC_MAX_OPT_LEVEL_ASMJS:=$(EMCC_MAX_OPT_LEVEL_ASMJS_FASTCOMP)
EMCC_OPTS_WASM_DEFAULT:=$(EMCC_OPTS_GENERAL) -s WASM=1 $(EMCC_OPTS_WASM_FASTCOMP)
endif

PREFILE:=libflac_pre.js
POSTFILE:=libflac_post.js

LIB_VERSION:=4
FLAC_VERSION:=1.3.3
FLAC:=flac-$(FLAC_VERSION)
FLAC_URL:="http://downloads.xiph.org/releases/flac/$(FLAC).tar.xz"
FLAC_MAKEFILE:=$(FLAC)/Makefile
FLAC_LIB_SRC:=$(FLAC)/src/libFLAC
FLAC_LIB:=$(FLAC_LIB_SRC)/.libs/libFLAC-static.a

OGG_VERSION:=1.3.4
OGG:=libogg-$(OGG_VERSION)
OGG_URL:="https://ftp.osuosl.org/pub/xiph/releases/ogg/$(OGG).tar.xz"
OGG_MAKEFILE:=$(OGG)/Makefile
OGG_LIB:=$(OGG)/src/lib/libogg.a

all: release_libs min_libs dev_libs

# release builds
release_libs: $(FLAC_LIB) dist/libflac.js dist/libflac.wasm.js

## asm.js release build
dist/libflac.js: $(FLAC_LIB) $(PREFILE) $(POSTFILE)
	$(EMCC) $(EMCC_DEF_OPT_LEVEL) $(EMCC_OPTS_ASMJS_DEFAULT) --pre-js $(PREFILE) --post-js $(POSTFILE) $(FLAC_LIB) -o $@
## wasm release build
dist/libflac.wasm.js: $(FLAC_LIB) $(PREFILE) $(POSTFILE)
	$(EMCC) $(EMCC_DEF_OPT_LEVEL) $(EMCC_OPTS_WASM_DEFAULT) --pre-js $(PREFILE) --post-js $(POSTFILE) $(FLAC_LIB) -o $@


# min builds
min_libs: $(FLAC_LIB) dist/libflac.min.js dist/libflac.min.wasm.js

## asm.js min build
dist/libflac.min.js: $(FLAC_LIB) $(PREFILE) $(POSTFILE)
	$(EMCC) $(EMCC_MIN_OPT_LEVEL) $(EMCC_OPTS_ASMJS_DEFAULT) --pre-js $(PREFILE) --post-js $(POSTFILE) $(FLAC_LIB) -o $@
## wasm min build
dist/libflac.min.wasm.js: $(FLAC_LIB) $(PREFILE) $(POSTFILE)
	$(EMCC) $(EMCC_MIN_OPT_LEVEL) $(EMCC_OPTS_WASM_DEFAULT) --pre-js $(PREFILE) --post-js $(POSTFILE) $(FLAC_LIB) -o $@


# dev builds
dev_libs: $(FLAC_LIB) dist/libflac.dev.js dist/libflac.dev.wasm.js

## asm.js dev build
dist/libflac.dev.js: $(FLAC_LIB) $(PREFILE) $(POSTFILE)
	$(EMCC) $(EMCC_MAX_OPT_LEVEL_ASMJS) $(EMCC_OPTS_ASMJS_DEFAULT) -s ASSERTIONS=1 --source-map-base ./ --pre-js $(PREFILE) --post-js $(POSTFILE) $(FLAC_LIB) -o $@
## wasm dev build
dist/libflac.dev.wasm.js: $(FLAC_LIB) $(PREFILE) $(POSTFILE)
	$(EMCC) $(EMCC_MAX_OPT_LEVEL_WASM) $(EMCC_OPTS_WASM_DEFAULT) -s ASSERTIONS=1 --source-map-base ./ --pre-js $(PREFILE) --post-js $(POSTFILE) $(FLAC_LIB) -o $@


$(OGG).tar.xz:
	test -e "$@" || wget $(OGG_URL)

$(OGG): $(OGG).tar.xz
	$(XZ) -dc $(OGG).tar.xz | $(TAR) -xv

$(OGG_MAKEFILE): $(OGG)
	cd $(OGG) && \
	$(EMCONFIGURE) ./configure

$(OGG_LIB): $(OGG_MAKEFILE)
	cd $(OGG) && \
	$(EMMAKE) make && \
	ln -sfn src/.libs lib && \
	ln -sfn include/ogg ogg


$(FLAC).tar.xz:
	test -e "$@" || wget $(FLAC_URL)

$(FLAC): $(FLAC).tar.xz
	$(XZ) -dc $(FLAC).tar.xz | $(TAR) -xv

$(FLAC_MAKEFILE): $(FLAC)
	cd $(FLAC) && \
	$(EMCONFIGURE) ./configure --host=asmjs --with-ogg=$(shell readlink -f $(OGG)) \
		--disable-asm-optimizations --disable-altivec --disable-doxygen-docs --disable-xmms-plugin --disable-cpplibs --disable-examples

$(FLAC_LIB): $(OGG_LIB) $(FLAC_MAKEFILE)
	cd $(FLAC_LIB_SRC) && \
	$(EMMAKE) make

clean:
	$(RM) -rf $(FLAC) && \
	$(RM) -rf $(OGG)

distclean: clean
	$(RM) $(FLAC).tar.xz && \
	$(RM) $(OGG).tar.xz

ifneq ($(realpath $(FLAC_LIB)),)
compclean:
	cd $(FLAC) && \
	make clean
else
compclean:
	echo "nothing to clean"
endif

.PHONY: clean distclean
