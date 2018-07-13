EMCC:=emcc
EMCC_DEF_OPT_LEVEL:=-O1
EMCC_MAX_OPT_LEVEL:=-O0 -g4
EMCC_MIN_OPT_LEVEL:=-O3
EMCC_OPTS_GENERAL:=-s NO_EXIT_RUNTIME=1 -s LINKABLE=1 -s RESERVED_FUNCTION_POINTERS=5 -s ALLOW_MEMORY_GROWTH=1 -s 'EXTRA_EXPORTED_RUNTIME_METHODS=["ccall","cwrap","getValue","setValue"]' -s EXPORTED_FUNCTIONS='["_FLAC__stream_encoder_set_verify","_FLAC__stream_encoder_set_compression_level","_FLAC__stream_encoder_set_blocksize","_FLAC__stream_encoder_new","_FLAC__stream_encoder_set_channels","_FLAC__stream_encoder_set_bits_per_sample","_FLAC__stream_encoder_set_sample_rate","_FLAC__stream_encoder_set_total_samples_estimate","_FLAC__stream_decoder_new","_FLAC__stream_decoder_set_md5_checking","_FLAC__stream_encoder_init_stream","_FLAC__stream_decoder_init_stream","_FLAC__stream_encoder_process_interleaved","_FLAC__stream_decoder_process_single","_FLAC__stream_decoder_process_until_end_of_stream","_FLAC__stream_decoder_process_until_end_of_metadata","_FLAC__stream_decoder_get_state","_FLAC__stream_encoder_get_state","_FLAC__stream_decoder_get_md5_checking","_FLAC__stream_encoder_finish","_FLAC__stream_decoder_finish","_FLAC__stream_decoder_reset","_FLAC__stream_encoder_delete","_FLAC__stream_decoder_delete"]'
EMCC_OPTS_ASMJS_DEV:=$(EMCC_OPTS_GENERAL) -s WASM=0
EMCC_OPTS_ASMJS_DEFAULT:=$(EMCC_OPTS_ASMJS_DEV) -s "BINARYEN_TRAP_MODE='clamp'"
EMCC_OPTS_WASM_DEFAULT:=$(EMCC_OPTS_GENERAL) -s "BINARYEN_TRAP_MODE='clamp'"
EMCONFIGURE:=emconfigure
EMMAKE:=emmake
TAR:=tar
XZ:=xz

PREFILE=libflac_pre.js
POSTFILE=libflac_post.js

LIB_VERSION:=4
FLAC_VERSION:=1.3.2
FLAC:=flac-$(FLAC_VERSION)
FLAC_URL:="http://downloads.xiph.org/releases/flac/$(FLAC).tar.xz"

all: all_asmjs all_wasm

# asm.js builds

all_asmjs: dist/libflac$(LIB_VERSION)-$(FLAC_VERSION).js dist/libflac$(LIB_VERSION)-$(FLAC_VERSION).min.js dist/libflac$(LIB_VERSION)-$(FLAC_VERSION).dev.js

dist/libflac$(LIB_VERSION)-$(FLAC_VERSION).js: $(FLAC) $(PREFILE) $(POSTFILE)
	$(EMCC) $(EMCC_DEF_OPT_LEVEL) $(EMCC_OPTS_ASMJS_DEFAULT) --pre-js $(PREFILE) --post-js $(POSTFILE) $(wildcard $(FLAC)/src/libFLAC/.libs/*.o) -o $@

dist/libflac$(LIB_VERSION)-$(FLAC_VERSION).min.js: $(FLAC) $(PREFILE) $(POSTFILE)
	$(EMCC) $(EMCC_MIN_OPT_LEVEL) $(EMCC_OPTS_ASMJS_DEFAULT) --pre-js $(PREFILE) --post-js $(POSTFILE) $(wildcard $(FLAC)/src/libFLAC/.libs/*.o) -o $@

dist/libflac$(LIB_VERSION)-$(FLAC_VERSION).dev.js: $(FLAC) $(PREFILE) $(POSTFILE)
	$(EMCC) $(EMCC_MAX_OPT_LEVEL) $(EMCC_OPTS_ASMJS_DEV) --pre-js $(PREFILE) --post-js $(POSTFILE) $(wildcard $(FLAC)/src/libFLAC/.libs/*.o) -o $@

# wasm builds

all_wasm: dist/libflac$(LIB_VERSION)-$(FLAC_VERSION).wasm.js dist/libflac$(LIB_VERSION)-$(FLAC_VERSION).min.wasm.js dist/libflac$(LIB_VERSION)-$(FLAC_VERSION).dev.wasm.js

dist/libflac$(LIB_VERSION)-$(FLAC_VERSION).wasm.js: $(FLAC) $(PREFILE) $(POSTFILE)
	$(EMCC) $(EMCC_DEF_OPT_LEVEL) $(EMCC_OPTS_WASM_DEFAULT) --pre-js $(PREFILE) --post-js $(POSTFILE) $(wildcard $(FLAC)/src/libFLAC/.libs/*.o) -o $@

dist/libflac$(LIB_VERSION)-$(FLAC_VERSION).min.wasm.js: $(FLAC) $(PREFILE) $(POSTFILE)
	$(EMCC) $(EMCC_MIN_OPT_LEVEL) $(EMCC_OPTS_WASM_DEFAULT) --pre-js $(PREFILE) --post-js $(POSTFILE) $(wildcard $(FLAC)/src/libFLAC/.libs/*.o) -o $@

dist/libflac$(LIB_VERSION)-$(FLAC_VERSION).dev.wasm.js: $(FLAC) $(PREFILE) $(POSTFILE)
	$(EMCC) $(EMCC_MAX_OPT_LEVEL) $(EMCC_OPTS_WASM_DEFAULT) --pre-js $(PREFILE) --post-js $(POSTFILE) $(wildcard $(FLAC)/src/libFLAC/.libs/*.o) -o $@

# custom builds that includ OGG

dist/libflac$(LIB_VERSION)-vs-$(FLAC_VERSION).js: $(FLAC) $(PREFILE) $(POSTFILE)
	$(EMCC) $(EMCC_DEF_OPT_LEVEL) $(EMCC_OPTS) -s USE_OGG=1 --pre-js $(PREFILE) --post-js $(POSTFILE) $(wildcard $(FLAC)/src/libFLAC/Emscripten/Release/*.o) -o $@

dist/libflac$(LIB_VERSION)-vs-$(FLAC_VERSION).min.js: $(FLAC) $(PREFILE) $(POSTFILE)
	$(EMCC) $(EMCC_MIN_OPT_LEVEL) $(EMCC_OPTS) -s USE_OGG=1 --pre-js $(PREFILE) --post-js $(POSTFILE) $(wildcard $(FLAC)/src/libFLAC/Emscripten/Release/*.o) -o $@

emccvs: dist/libflac$(LIB_VERSION)-vs-$(FLAC_VERSION).js dist/libflac$(LIB_VERSION)-vs-$(FLAC_VERSION).min.js

emmake: $(FLAC)
	cd $(FLAC) && \
	$(EMMAKE) make

$(FLAC): $(FLAC).tar.xz
	$(XZ) -dc $@.tar.xz | $(TAR) -xv && \
	cd $@ && \
	$(EMCONFIGURE) ./configure --disable-asm-optimizations --disable-3dnow --disable-altivec --disable-thorough-tests --disable-doxygen-docs --disable-xmms-plugin --disable-cpplibs --disable-ogg --disable-oggtest && \
	$(EMMAKE) make

$(FLAC).tar.xz:
	test -e "$@" || wget $(FLAC_URL)

clean:
	$(RM) -rf $(FLAC)

distclean: clean
	$(RM) $(FLAC).tar.xz

compclean:
	cd $(FLAC) && \
	make clean

.PHONY: clean distclean
