EMCC:=emcc
EMCC_OPTS:=-O1 -s LINKABLE=1 -s ASM_JS=0
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
	$(EMCC) $(EMCC_OPTS) --pre-js $(PREFILE) --post-js $(POSTFILE) $(wildcard $(FLAC)/src/libFLAC/.libs/*.o) -o $@

dist/libflac.min.js: dist/libflac.js $(CLOSURE_COMPILER)
	java -jar $(CLOSURE_COMPILER) --language_in ECMASCRIPT5 --js $< --js_output_file $@

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
