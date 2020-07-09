(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./utils/data-utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Encoder = void 0;
    const data_utils_1 = require("./utils/data-utils");
    class Encoder {
        constructor(Flac, _options) {
            this.Flac = Flac;
            this._options = _options;
            this._isError = false;
            this._isInitialized = false;
            this._isFinished = false;
            /**
             * cache for the encoded data
             */
            this._data = [];
            this._id = Flac.create_libflac_encoder(_options.sampleRate, _options.channels, _options.bitsPerSample, _options.compression, _options.totalSamples, _options.verify);
            this._onDestroyed = (evt) => {
                if (evt.target.id === this._id) {
                    this._id = void (0);
                    this._isInitialized = false;
                    this._isFinished = false;
                    Flac.off('destroyed', this._onDestroyed);
                }
            };
            Flac.on('destroyed', this._onDestroyed);
            this._onWrite = (data) => {
                this._data.push(data);
            };
            this._onMetaData = (m) => {
                this._metadata = m;
            };
            if (this._id === 0) {
                this._isError = true;
            }
            else {
                // if(this._isAnalyse(this._options)){
                // 	Flac.setOptions(this._id, this._options);
                // }
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
            return this._data;
        }
        _init(isEncodeOgg) {
            if (this._id) {
                const state = isEncodeOgg ?
                    this.Flac.init_encoder_ogg_stream(this._id, this._onWrite, this._onMetaData) :
                    this.Flac.init_encoder_stream(this._id, this._onWrite, this._onMetaData);
                this._isError = state !== 0;
                if (state === 0) {
                    this._isInitialized = true;
                    this._isFinished = false;
                }
            }
        }
        /**
         * reset encoder:
         * resets internal state and clears cached input/output data.
         */
        reset(options) {
            if (this._id) {
                // do reset encoder, if it was initialized -> call finished()
                let state = this.Flac.FLAC__stream_encoder_get_state(this._id);
                if (state === /* FLAC__STREAM_ENCODER_OK */ 0) {
                    this.Flac.FLAC__stream_encoder_finish(this._id);
                    state = this.Flac.FLAC__stream_encoder_get_state(this._id);
                }
                if (state === /* FLAC__STREAM_ENCODER_UNINITIALIZED */ 1) {
                    if (options) {
                        Object.assign(this._options, options);
                        // if(this._isAnalyse(this._options)){
                        // 	Flac.setOptions(this._id, this._options);
                        // }
                        if (typeof options.verify !== 'undefined' && this.Flac.FLAC__stream_encoder_get_verify(this._id) != /*non-exact comparision*/ this._options.verify) {
                            this.Flac.FLAC__stream_encoder_set_verify(this._id, !!this._options.verify);
                        }
                        // TODO unsupported as of yet:
                        // if(typeof options.sampleRate !== 'number'){
                        // 	this.Flac.FLAC__stream_encoder_set_sample_rate(this._id, this._options.sampleRate);
                        // }
                        // if(typeof options.channels !== 'number'){
                        // 	this.Flac.FLAC__stream_encoder_set_channels(this._id, this._options.channels);
                        // }
                        // if(typeof options.bitsPerSample !== 'number'){
                        // 	this.Flac.FLAC__stream_encoder_set_bits_per_sample(this._id, this._options.bitsPerSample);
                        // }
                        // if(typeof options.totalSamples !== 'number'){
                        // 	this.Flac.FLAC__stream_encoder_set_total_samples_estimate(this._id, this._options.totalSamples);
                        // }
                        if (typeof options.compression !== 'number') {
                            this.Flac.FLAC__stream_encoder_set_compression_level(this._id, this._options.compression);
                        }
                    }
                    this._data.splice(0);
                    this._isInitialized = false;
                    this._isFinished = false;
                    this._init(this._options.isOgg);
                    return this._isError;
                }
            }
            return false;
        }
        /**
         * encode PCM data to FLAC
         * @param  pcmData the PCM data: either interleaved, or an array of the channels
         * @param  numberOfSamples the number of samples (for one channel)
         * @param  isInterleaved if the PCM data is interleaved or an array of channel PCM data
         * @return <code>true</code> if encoding was successful
         *
         * @throws Error in case non-interleaved encoding data did not match the number of expected channels
         */
        encode(pcmData, numberOfSamples, isInterleaved) {
            if (this._id && this._isInitialized && !this._isFinished) {
                // console.log('encoding with ', this._options, pcmData);
                if (typeof pcmData === 'undefined') {
                    // console.log('finish encoding...');
                    return this._finish();
                }
                if (typeof isInterleaved === 'undefined') {
                    // console.log('determining interleaved ...');
                    isInterleaved = !(Array.isArray(pcmData) && pcmData[0] instanceof Int32Array);
                    // console.log('is interleaved?: ', isInterleaved);
                }
                if (typeof numberOfSamples === 'undefined') {
                    // console.log('calculating numberOfSamples...');
                    // const byteNum = this._options.bitsPerSample / 8;
                    const buff = isInterleaved ? pcmData : pcmData[0];
                    // console.log('calculating numberOfSamples: byteNum='+byteNum+' for buffer ', buff);
                    numberOfSamples = (buff.byteLength - buff.byteOffset) / ((isInterleaved ? this._options.channels : 1) * buff.BYTES_PER_ELEMENT); // * byteNum);
                }
                if (isInterleaved) {
                    // console.log('encoding interleaved ('+numberOfSamples+' samples)...');
                    return !!this.Flac.FLAC__stream_encoder_process_interleaved(this._id, pcmData, numberOfSamples);
                }
                // ASSERT encode non-interleaved
                if (this._options.channels !== pcmData.length) {
                    throw new Error(`Wrong number of channels: expected ${this._options.channels} but got ${pcmData.length}`);
                }
                // console.log('encoding non-interleaved ('+numberOfSamples+' samples)...');
                return !!this.Flac.FLAC__stream_encoder_process(this._id, pcmData, numberOfSamples);
            }
            return false;
        }
        getSamples() {
            return data_utils_1.mergeBuffers(this._data, data_utils_1.getLength(this._data));
        }
        getState() {
            if (this._id) {
                return this.Flac.FLAC__stream_encoder_get_state(this._id);
            }
            return -1;
        }
        destroy() {
            if (this._id) {
                this.Flac.FLAC__stream_encoder_delete(this._id);
            }
        }
        _finish() {
            if (this._id && this._isInitialized && !this._isFinished) {
                if (!!this.Flac.FLAC__stream_encoder_finish(this._id)) {
                    this._isFinished = true;
                    return true;
                }
                ;
            }
            return false;
        }
    }
    exports.Encoder = Encoder;
});
