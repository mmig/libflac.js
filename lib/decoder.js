(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./utils/wav-utils", "./utils/data-utils", "./before-ready-handler"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Decoder = void 0;
    const wav_utils_1 = require("./utils/wav-utils");
    const data_utils_1 = require("./utils/data-utils");
    const before_ready_handler_1 = require("./before-ready-handler");
    class Decoder {
        constructor(Flac, _options = {}) {
            var _a;
            this.Flac = Flac;
            this._options = _options;
            this._isError = false;
            this._isInitialized = false;
            this._isFinished = false;
            /**
             * input cache for decoding-chunk modus
             */
            this._inputCache = [];
            /**
             * the current reading offset within the current input chache chunk
             */
            this._currentInputCacheOffset = -1;
            /**
             * indicates that not enough data is cached for decoding the next chunk or
             * decoding is currently in progress
             */
            this._decodingChunkPaused = true;
            /**
             * threshold for minimal amount of data (in bytes) that need to be cached,
             * before triggering decoding the next data chunk
             */
            this._min_data_decode_threshold = (4096 / 2); // NOTE: should be somewhat greater than 1024
            /**
             * cache for the decoded data
             */
            this.data = [];
            this._id = Flac.create_libflac_decoder(_options.verify);
            this._onDestroyed = (evt) => {
                var _a;
                if (evt.target.id === this._id) {
                    this._id = void (0);
                    this._isInitialized = false;
                    this._isFinished = false;
                    Flac.off('destroyed', this._onDestroyed);
                    if ((_a = this._beforeReadyHandler) === null || _a === void 0 ? void 0 : _a.enabled) {
                        this._beforeReadyHandler.enabled = false;
                    }
                }
            };
            Flac.on('destroyed', this._onDestroyed);
            this._onRead = (bufferSize) => {
                if (this._onReadData) {
                    return this._onReadData(bufferSize);
                }
                //if no read function is set, return error result:
                return { buffer: undefined, readDataLength: 0, error: true };
            };
            this._onWrite = (data) => {
                this.addData(data);
            };
            this._onMetaData = (m) => {
                if (m) {
                    this._metadata = m;
                }
            };
            this._onError = (code, description) => {
                this._isError = true;
                // TODO emit error instead!
                console.error(`Decoder[${this._id}] encoutered error (${code}): ${description}`);
            };
            if ((_a = this._options) === null || _a === void 0 ? void 0 : _a.autoOnReady) {
                this._beforeReadyHandler = new before_ready_handler_1.BeforeReadyHandler(this, true, this.Flac);
            }
            if (this._id === 0) {
                this._isError = true;
            }
            else {
                if (this._isAnalyse(this._options)) {
                    Flac.setOptions(this._id, this._options);
                }
                this._init(this._options.isOgg);
            }
        }
        get initialized() {
            return this._isInitialized;
        }
        get finished() {
            return this._isFinished;
        }
        get metadata() {
            return this._metadata;
        }
        get rawData() {
            return this.data;
        }
        get isWaitOnReady() {
            var _a;
            return ((_a = this._beforeReadyHandler) === null || _a === void 0 ? void 0 : _a.isWaitOnReady) || false;
        }
        _init(isDecodeOgg) {
            if (this._id) {
                const state = isDecodeOgg ?
                    this.Flac.init_decoder_ogg_stream(this._id, this._onRead, this._onWrite, this._onError, this._onMetaData) :
                    this.Flac.init_decoder_stream(this._id, this._onRead, this._onWrite, this._onError, this._onMetaData);
                this._isError = state !== 0;
                if (state === 0) {
                    this._isInitialized = true;
                    this._isFinished = false;
                }
            }
            else {
                this._handleBeforeReady('_init', arguments);
            }
        }
        /**
         * reset decoder:
         * resets internal state and clears cached input/output data.
         */
        reset(options) {
            if (this._id && !!this.Flac.FLAC__stream_decoder_reset(this._id)) {
                if (options) {
                    Object.assign(this._options, options);
                    this.Flac.setOptions(this._id, this._options);
                    const isVerify = this.Flac.FLAC__stream_decoder_get_md5_checking(this._id);
                    if (typeof this._options.verify !== 'undefined' && isVerify != /*non-exact comparision*/ this._options.verify) {
                        this.Flac.FLAC__stream_decoder_set_md5_checking(this._id, !!this._options.verify);
                    }
                }
                this._resetInputCache();
                this.clearData();
                this._metadata = undefined;
                this._onReadData = undefined;
                this._isInitialized = false;
                this._isFinished = false;
                this._init(this._options.isOgg);
                return this._isError;
            }
            return this._handleBeforeReady('reset', arguments);
        }
        /**
         * decode all data at once (will automatically finishes decoding)
         *
         * **NOTE**: do not mix with [[decodeChunk]] calls!
         *
         * @param  flacData the (complete) FLAC data to decode
         * @return `true` if encoding was successful
         */
        decode(flacData) {
            if (this._id && this._isInitialized && !this._isFinished) {
                this._onReadData = this._createReadFunc(flacData);
                if (!!this.Flac.FLAC__stream_decoder_process_until_end_of_stream(this._id)) {
                    return this._finish();
                }
                ;
                return false;
            }
            return this._handleBeforeReady('decode', arguments);
        }
        /**
         * decode next chunk of data:
         * if not enough data for decoding is cached, will pause until enough data
         * is cached, or flushing of the cache is forced.
         *
         * **NOTE**: do not mix with [[decode]] calls!
         *
         * @param  [flacData] the data chunk to decode:
         *                    if omitted, will finish the decoding (any cached data will be flushed).
         * @param  [flushCache] flush the cached data and finalize decoding
         * @return `true` if encoding was successful
         */
        decodeChunk(flacData, flushCache) {
            if (this._id && this._isInitialized && !this._isFinished) {
                if (!this._onReadData) {
                    this._onReadData = this._createReadChunkFunc();
                }
                if (typeof flacData === 'boolean') {
                    flushCache = true;
                    flacData = void (0);
                }
                if (flacData) {
                    this._addInputChunk(flacData);
                }
                else {
                    flushCache = true;
                }
                if (!flushCache && !this._decodingChunkPaused) {
                    //decoding in progress -> do nothing
                    return true;
                }
                if (!flushCache && !this._canReadChunk()) {
                    //if there is not enough buffered data yet, do wait
                    return true;
                }
                // console.log('decodingPaused ' + this._decodingChunkPaused);//debug
                this._decodingChunkPaused = false;
                //request to decode data chunks until end-of-stream is reached (or decoding is paused):
                let decState = 0;
                while (!this._decodingChunkPaused && decState <= 3) {
                    if (!this.Flac.FLAC__stream_decoder_process_single(this._id)) {
                        return false;
                    }
                    decState = this.Flac.FLAC__stream_decoder_get_state(this._id);
                }
                if (flushCache) {
                    return this._finish();
                }
                else {
                    return true;
                }
            }
            return this._handleBeforeReady('decodeChunk', arguments);
        }
        /**
         * get the decoded samples
         * @param  isInterleaved if `true` interleaved WAV samples are returned,
         * 						otherwise, an array of the (raw) PCM samples will be returned
         * 						where the length of the array corresponds to the number of channels
         * @return the samples: either interleaved as `Uint8Array` or non-interleaved
         *         as `Uint8Array[]` with the array's length corresponding to the number of channels
         */
        getSamples(isInterleaved) {
            if (this.metadata) {
                isInterleaved = !!isInterleaved;
                const channels = this.metadata.channels;
                if (isInterleaved) {
                    return wav_utils_1.interleave(this.data, channels, this.metadata.bitsPerSample);
                }
                const data = new Array(channels);
                for (let i = channels - 1; i >= 0; --i) {
                    const chData = this.mapData(d => d[i]);
                    data[i] = data_utils_1.mergeBuffers(chData, data_utils_1.getLength(chData));
                }
                return data;
            }
            throw new Error('Metadata not available');
        }
        getState() {
            if (this._id) {
                return this.Flac.FLAC__stream_decoder_get_state(this._id);
            }
            return -1;
        }
        destroy() {
            if (this._id) {
                this.Flac.FLAC__stream_decoder_delete(this._id);
            }
            this._beforeReadyHandler && (this._beforeReadyHandler.enabled = false);
            this._metadata = void (0);
            this.clearData();
            this._inputCache.splice(0);
        }
        addData(decData) {
            this.data.push(decData);
        }
        clearData() {
            this.data.splice(0);
        }
        mapData(mapFunc) {
            return this.data.map(mapFunc);
        }
        _isAnalyse(opt) {
            return opt.analyseResiduals || opt.analyseSubframes;
        }
        _finish() {
            if (this._id && this._isInitialized && !this._isFinished) {
                if (!!this.Flac.FLAC__stream_decoder_finish(this._id)) {
                    this._isFinished = true;
                    return true;
                }
                ;
            }
            return false;
        }
        _createReadFunc(binData) {
            this._resetInputCache();
            const size = binData.buffer.byteLength;
            let currentDataOffset = 0;
            return (bufferSize) => {
                const end = currentDataOffset === size ? -1 : Math.min(currentDataOffset + bufferSize, size);
                if (end !== -1) {
                    const _buffer = binData.subarray(currentDataOffset, end);
                    const numberOfReadBytes = end - currentDataOffset;
                    currentDataOffset = end;
                    return { buffer: _buffer, readDataLength: numberOfReadBytes, error: false };
                }
                return { buffer: undefined, readDataLength: 0 };
            };
        }
        _addInputChunk(data) {
            this._inputCache.push(data);
        }
        _canReadChunk() {
            return data_utils_1.getLength(this._inputCache) >= this._min_data_decode_threshold;
        }
        _resetInputCache() {
            this._decodingChunkPaused = true;
            this._currentInputCacheOffset = -1;
            if (this._inputCache.length > 0) {
                this._inputCache.splice(0);
            }
        }
        _createReadChunkFunc() {
            this._resetInputCache();
            this._currentInputCacheOffset = 0;
            return (bufferSize) => {
                // console.log('_readChunk: '+bufferSize, this._inputCache);
                if (!this._inputCache.length) {
                    return {
                        buffer: undefined,
                        readDataLength: 0,
                        error: false
                    };
                }
                const chunk = this._inputCache[0];
                const size = chunk.buffer.byteLength;
                const start = this._currentInputCacheOffset;
                const end = start === size ? -1 : Math.min(start + bufferSize, size);
                let _buffer;
                let numberOfReadBytes;
                if (end !== -1) {
                    // console.log('_readChunk: reading ['+start+', '+end+'] ');
                    _buffer = chunk.subarray(start, end);
                    numberOfReadBytes = end - start;
                    this._currentInputCacheOffset = end;
                }
                else {
                    numberOfReadBytes = 0;
                }
                // console.log('numberOfReadBytes', numberOfReadBytes);
                if (numberOfReadBytes < bufferSize) {
                    //use next buffered data-chunk for decoding:
                    this._inputCache.shift(); //<- remove first (i.e. active) data-chunk from buffer
                    const nextSize = this._inputCache.length > 0 ? this._inputCache[0].buffer.byteLength : 0;
                    this._currentInputCacheOffset = 0;
                    if (nextSize === 0) {
                        // console.log('_readChunk: setting canDecodeNextChunk -> false');// debug
                        this._decodingChunkPaused = true; //<- set to "pause" if no more data is available
                    }
                }
                // console.log('_readChunk: returning ', numberOfReadBytes, _buffer);
                return {
                    buffer: _buffer,
                    readDataLength: numberOfReadBytes,
                    error: false
                };
            };
        }
        _handleBeforeReady(funcName, args) {
            if (this._beforeReadyHandler) {
                return this._beforeReadyHandler.handleBeforeReady(funcName, args);
            }
            return false;
        }
    }
    exports.Decoder = Decoder;
});
