EMCC:=emcc
EMCC_DEF_OPT_LEVEL:=-O0 -g4
EMCC_MIN_OPT_LEVEL:=-O3 --closure 1
EMCC_OPTS:=-s LINKABLE=1 -s RESERVED_FUNCTION_POINTERS=20 -s EXPORTED_FUNCTIONS='["_FLAC__stream_encoder_process_interleaved","_FLAC__stream_decoder_delete","_FLAC__stream_decoder_finish","_FLAC__stream_decoder_get_state","_FLAC__stream_decoder_init_stream","_FLAC__stream_decoder_new","_FLAC__stream_decoder_process_single","_FLAC__stream_decoder_process_until_end_of_stream","_FLAC__stream_decoder_reset","_FLAC__stream_encoder_delete","_FLAC__stream_encoder_finish","_FLAC__stream_encoder_init_file","_FLAC__stream_encoder_init_stream","_FLAC__stream_encoder_new","_FLAC__stream_encoder_set_bits_per_sample","_FLAC__stream_encoder_set_channels","_FLAC__stream_encoder_set_compression_level","_FLAC__stream_encoder_set_sample_rate","_FLAC__stream_encoder_set_total_samples_estimate","_FLAC__stream_encoder_set_verify"]'
EMCONFIGURE:=emconfigure
EMMAKE:=emmake
FLAC_URL:="http://downloads.xiph.org/releases/flac/flac-1.3.0.tar.xz"
TAR:=tar
XZ:=xz

CLOSURE_COMPILER=libs/compiler.jar
PREFILE=libflac_pre.js
POSTFILE=libflac_post.js

FLAC_VERSION:=1.3.0
FLAC:=flac-$(FLAC_VERSION)

all: dist/libflac.js dist/libflac.min.js

dist/libflac.js: $(FLAC) $(PREFILE) $(POSTFILE)
	$(EMCC) $(EMCC_DEF_OPT_LEVEL) $(EMCC_OPTS) --pre-js $(PREFILE) --post-js $(POSTFILE) $(wildcard $(FLAC)/src/libFLAC/.libs/*.o) -o $@

dist/libflac.min.js: $(FLAC) $(PREFILE) $(POSTFILE)
	$(EMCC) $(EMCC_MIN_OPT_LEVEL) $(EMCC_OPTS) --pre-js $(PREFILE) --post-js $(POSTFILE) $(wildcard $(FLAC)/src/libFLAC/.libs/*.o) -o $@

#dist/libflac.min.js: dist/libflac.opt.js $(CLOSURE_COMPILER)
#	java -jar $(CLOSURE_COMPILER) --language_in ECMASCRIPT5 --js $< --js_output_file $@

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

.PHONY: clean distclean
