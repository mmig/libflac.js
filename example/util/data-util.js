
/**
 * utility functions compiled from:
 * <libflacjs>/src/util/*.ts
 */

(function(e, a) { for(var i in a) e[i] = a[i]; }(window, /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(__webpack_require__(1), exports);
__exportStar(__webpack_require__(2), exports);
__exportStar(__webpack_require__(3), exports);
__exportStar(__webpack_require__(4), exports);


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.getLengthFor = exports.mergeBuffers = exports.getLength = void 0;
function getLength(recBuffers) {
    var recLength = 0;
    for (var i = recBuffers.length - 1; i >= 0; --i) {
        recLength += recBuffers[i].byteLength;
    }
    return recLength;
}
exports.getLength = getLength;
function mergeBuffers(channelBuffer, recordingLength) {
    var result = new Uint8Array(recordingLength);
    var offset = 0;
    var lng = channelBuffer.length;
    for (var i = 0; i < lng; i++) {
        var buffer = channelBuffer[i];
        result.set(buffer, offset);
        offset += buffer.length;
    }
    return result;
}
exports.mergeBuffers = mergeBuffers;
function getLengthFor(recBuffers, index, sampleBytes, bytePadding) {
    var recLength = 0, blen;
    var decrFac = bytePadding > 0 ? bytePadding / sampleBytes : 0; //<- factor do decrease size in case of padding bytes
    for (var i = recBuffers.length - 1; i >= 0; --i) {
        blen = recBuffers[i][index].byteLength;
        if (bytePadding > 0) {
            recLength += blen - (decrFac * blen);
        }
        else {
            recLength += blen;
        }
    }
    return recLength;
}
exports.getLengthFor = getLengthFor;


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.exportFlacFile = exports.writeMd5 = exports.addFLACMetaData = exports.exportFlacData = void 0;
const data_utils_1 = __webpack_require__(1);
function exportFlacData(recBuffers, metaData, isOgg) {
    var recLength = data_utils_1.getLength(recBuffers);
    if (metaData) {
        addFLACMetaData(recBuffers, metaData, isOgg);
    }
    //convert buffers into one single buffer
    return Promise.resolve(data_utils_1.mergeBuffers(recBuffers, recLength));
}
exports.exportFlacData = exportFlacData;
function addFLACMetaData(chunks, metadata, isOgg) {
    var offset = 4;
    var dataIndex = 0;
    var data = chunks[0]; //1st data chunk should contain FLAC identifier "fLaC" or OGG identifier "OggS"
    if (isOgg) {
        offset = 13;
        dataIndex = 1;
        if (data.length < 4 || String.fromCharCode.apply(null, data.subarray(0, 4)) != "OggS") {
            console.error('Unknown data format: cannot add additional FLAC meta data to OGG header');
            return;
        }
    }
    data = chunks[dataIndex]; //data chunk should contain FLAC identifier "fLaC"
    if (data.length < 4 || String.fromCharCode.apply(null, data.subarray(offset - 4, offset)) != "fLaC") {
        console.error('Unknown data format: cannot add additional FLAC meta data to header');
        return;
    }
    if (isOgg) {
        console.info('OGG Container: cannot add additional FLAC meta data to header due to OGG format\'s header checksum!');
        return;
    }
    //first chunk only contains the flac identifier string?
    if (data.length == 4) {
        data = chunks[dataIndex + 1]; //get 2nd data chunk which should contain STREAMINFO meta-data block (and probably more)
        offset = 0;
    }
    var view = new DataView(data.buffer);
    // console.log('addFLACMetaData: '+(isOgg? 'OGG' : 'FLAC')+' (offset: '+offset+') -> ', metadata, view)
    //NOTE by default, the encoder writes a 2nd meta-data block (type VORBIS_COMMENT) with encoder/version info -> do not set "is last" to TRUE for first one
    //	// write "is last meta data block" & type STREAMINFO type (0) as little endian combined uint1 & uint7 -> uint8:
    //	var isLast = 1;//1 bit
    //	var streamInfoType = 0;//7 bit
    //	view.setUint8(0 + offset, isLast << 7 | streamInfoType, true);//8 bit
    // block-header: STREAMINFO type, block length -> already set
    // block-content: min_blocksize, max_blocksize -> already set
    // write min_framesize as little endian uint24:
    view.setUint8(8 + offset, metadata.min_framesize >> 16); //24 bit
    view.setUint8(9 + offset, metadata.min_framesize >> 8); //24 bit
    view.setUint8(10 + offset, metadata.min_framesize); //24 bit
    // write max_framesize as little endian uint24:
    view.setUint8(11 + offset, metadata.max_framesize >> 16); //24 bit
    view.setUint8(12 + offset, metadata.max_framesize >> 8); //24 bit
    view.setUint8(13 + offset, metadata.max_framesize); //24 bit
    // block-content: sampleRate, channels, bitsPerSample -> already set
    // write total_samples as little endian uint36:
    //TODO set last 4 bits to half of the value in index 17
    view.setUint8(18 + offset, metadata.total_samples >> 24); //36 bit
    view.setUint8(19 + offset, metadata.total_samples >> 16); //36 bit
    view.setUint8(20 + offset, metadata.total_samples >> 8); //36 bit
    view.setUint8(21 + offset, metadata.total_samples); //36 bit
    writeMd5(view, 22 + offset, metadata.md5sum); //16 * 8 bit
}
exports.addFLACMetaData = addFLACMetaData;
function writeMd5(view, offset, str) {
    var index;
    for (var i = 0; i < str.length / 2; ++i) {
        index = i * 2;
        view.setUint8(i + offset, parseInt(str.substring(index, index + 2), 16));
    }
}
exports.writeMd5 = writeMd5;
/**
 *  creates blob element from libflac-encoder output
 */
function exportFlacFile(recBuffers, metaData, isOgg) {
    const recLength = data_utils_1.getLength(recBuffers);
    if (metaData) {
        addFLACMetaData(recBuffers, metaData, isOgg);
    }
    //convert buffers into one single buffer
    const samples = data_utils_1.mergeBuffers(recBuffers, recLength);
    return new Blob([samples], { type: isOgg ? 'audio/ogg' : 'audio/flac' });
}
exports.exportFlacFile = exportFlacFile;


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.exportWavFile = exports.writeData = exports.writeString = exports.encodeWAV = exports.interleave = exports.wav_file_processing_convert_to32bitdata = void 0;
const data_utils_1 = __webpack_require__(1);
/**
 *  converts the PCM data of the wav file (each sample stored as 8 or 16 or 24 bit value) into
 *  a format expected by the libflac-encoder method (each sample stored as 32 bit value in a 32-bit array)
 */
function wav_file_processing_convert_to32bitdata(arraybuffer, bps) {
    var decFunc;
    switch (bps) {
        case 8:
            decFunc = convert_8bitdata_to32bitdata;
            break;
        case 16:
            decFunc = convert_16bitdata_to32bitdata;
            break;
        case 24:
            decFunc = convert_24bitdata_to32bitdata;
            break;
    }
    if (!decFunc) {
        // -> unsupported bit-depth
        return void (0);
    }
    var bytes = bps / 8;
    var ab_i16 = new DataView(arraybuffer, 44);
    var buf_length = ab_i16.byteLength;
    var buf32_length = buf_length / bytes;
    var buffer_i32 = new Int32Array(buf32_length);
    var view = new DataView(buffer_i32.buffer);
    var index = 0;
    for (var j = 0; j < buf_length; j += bytes) {
        view.setInt32(index, decFunc(ab_i16, j), true);
        index += 4;
    }
    return buffer_i32;
}
exports.wav_file_processing_convert_to32bitdata = wav_file_processing_convert_to32bitdata;
/**
 *  converts the PCM data of the wav file (each sample stored as 8 bit value) into
 *  a format expected by the libflac-encoder method (each sample stored as 32 bit value in a 32-bit array)
 */
function convert_8bitdata_to32bitdata(dataView, i) {
    return dataView.getUint8(i) - 128 /* 0x80 */;
}
/**
 *  converts the PCM data of the wav file (each sample stored as 16 bit value) into
 *  a format expected by the libflac-encoder method (each sample stored as 32 bit value in a 32-bit array)
 */
function convert_16bitdata_to32bitdata(dataView, i) {
    return dataView.getInt16(i, true);
}
/**
 *  converts the PCM data of the wav file (each sample stored as 24 bit value) into
 *  a format expected by the libflac-encoder method (each sample stored as 32 bit value in a 32-bit array)
 */
function convert_24bitdata_to32bitdata(dataView, i) {
    var b = (((dataView.getUint8(i + 2) << 8) | dataView.getUint8(i + 1)) << 8) | dataView.getUint8(i);
    if ((b & 8388608 /* 0x00800000 */) > 0) {
        b |= 4278190080; // 0xFF000000;
    }
    else {
        b &= 16777215; // 0x00FFFFFF;
    }
    return b;
}
function interleave(recBuffers, channels, bitsPerSample) {
    let byteLen = bitsPerSample / 8;
    //NOTE 24-bit samples are padded with 1 byte
    const pad8 = (bitsPerSample === 24 || bitsPerSample === 8) ? 1 : 0;
    if (pad8) {
        byteLen += pad8;
    }
    //calculate total length for interleaved data
    let dataLength = 0;
    for (let i = 0; i < channels; ++i) {
        dataLength += data_utils_1.getLengthFor(recBuffers, i, byteLen, pad8);
    }
    const result = new Uint8Array(dataLength);
    let buff, buffLen = 0, index = 0, inputIndex = 0, ch_i = 0, b_i = 0, pad_i = false, ord = false;
    for (let arrNum = 0, arrCount = recBuffers.length; arrNum < arrCount; ++arrNum) {
        //for each buffer (i.e. array of Uint8Arrays):
        buff = recBuffers[arrNum];
        buffLen = buff[0].length;
        inputIndex = 0;
        pad_i = false;
        ord = false;
        //interate over buffer
        while (inputIndex < buffLen) {
            //write channel data
            for (ch_i = 0; ch_i < channels; ++ch_i) {
                //write sample-length
                for (b_i = 0; b_i < byteLen; ++b_i) {
                    // write data & update target-index
                    if (pad8) {
                        pad_i = pad8 && (b_i === byteLen - pad8);
                        if (pad_i) {
                            if (buff[ch_i][inputIndex + b_i] !== 0 && buff[ch_i][inputIndex + b_i] !== 255) {
                                console.error('[ERROR] mis-aligned padding: ignoring non-padding value (padding should be 0 or 255) at ' + (inputIndex + b_i) + ' -> ', buff[ch_i][inputIndex + b_i]);
                            }
                        }
                        else {
                            if (bitsPerSample === 8) {
                                ord = buff[ch_i][inputIndex + b_i + 1] === 0;
                                result[index++] = ord ? buff[ch_i][inputIndex + b_i] | 128 : buff[ch_i][inputIndex + b_i] & 127;
                            }
                            else {
                                result[index++] = buff[ch_i][inputIndex + b_i];
                            }
                        }
                    }
                    else {
                        result[index++] = buff[ch_i][inputIndex + b_i];
                    }
                }
            }
            //update source-index
            inputIndex += byteLen;
        }
    }
    return result;
}
exports.interleave = interleave;
/**
 * write PCM data to a WAV file, incl. header
 *
 * @param samples the PCM audio data
 * @param sampleRate the sample rate for the audio data
 * @param channels the number of channels that the audio data contains
 * @param bitsPerSample the bit-per-sample
 *
 * @returns the WAV data incl. header
 */
function encodeWAV(samples, sampleRate, channels, bitsPerSample) {
    var bytePerSample = bitsPerSample / 8;
    var length = samples.length * samples.BYTES_PER_ELEMENT;
    var buffer = new ArrayBuffer(44 + length);
    var view = new DataView(buffer);
    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + length, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, channels, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * channels * bytePerSample, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, channels * bytePerSample, true);
    /* bits per sample */
    view.setUint16(34, bitsPerSample, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, length, true);
    writeData(view, 44, samples);
    return view;
}
exports.encodeWAV = encodeWAV;
function writeString(view, offset, str) {
    for (var i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}
exports.writeString = writeString;
function writeData(view, offset, input) {
    for (var i = 0; i < input.length; ++i, ++offset) {
        view.setUint8(offset, input[i]);
    }
}
exports.writeData = writeData;
/**
 * creates blob element PCM audio data incl. WAV header
 *
 * @param recBuffers
 * 			the array of buffered audio data, where each entry contains an array for the channels, i.e.
 * 			recBuffers[0]: [channel_1_data, channel_2_data, ..., channel_n_data]
 * 			recBuffers[1]: [channel_1_data, channel_2_data, ..., channel_n_data]
 * 			...
 * 			recBuffers[length-1]: [channel_1_data, channel_2_data, ..., channel_n_data]
 *
 * @returns blob with MIME type audio/wav
 */
function exportWavFile(recBuffers, sampleRate, channels, bitsPerSample) {
    //convert buffers into one single buffer
    const samples = interleave(recBuffers, channels, bitsPerSample);
    const dataView = encodeWAV(samples, sampleRate, channels, bitsPerSample);
    return new Blob([dataView], { type: 'audio/wav' });
}
exports.exportWavFile = exportWavFile;


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.wav_file_processing_read_parameters = exports.to_string = exports.flac_file_processing_check_flac_format = exports.wav_file_processing_check_wav_format = void 0;
/**
 *  checks if the given ui8_data (ui8array) is of a wav-file
 */
function wav_file_processing_check_wav_format(ui8_data) {
    // check: is file a compatible wav-file?
    if ((ui8_data.length < 44) ||
        (to_string(ui8_data, 0, 4) != "RIFF") ||
        (to_string(ui8_data, 8, 16) != "WAVEfmt ") ||
        (to_string(ui8_data, 36, 40) != "data")) {
        console.log("ERROR: wrong format for wav-file.");
        return false;
    }
    return true;
}
exports.wav_file_processing_check_wav_format = wav_file_processing_check_wav_format;
/**
 *  checks if the given ui8_data (ui8array) is of a flac-file
 */
function flac_file_processing_check_flac_format(ui8_data, isOgg) {
    var offset = 4; //-> offset for end of FLAC identifier "fLaC"
    // check: is file really an OGG container file?
    if (isOgg) {
        offset = 41;
        if (ui8_data.length < 4 || to_string(ui8_data, 0, 4) != "OggS") {
            console.error('ERROR: wrong format for OGG-file.');
            return false;
        }
    }
    // check: is file a compatible flac-file?
    if ((ui8_data.length < 38 + offset) ||
        (to_string(ui8_data, offset - 4, offset) != "fLaC")) {
        console.error("ERROR: wrong format for flac-file.");
        return false;
    }
    var view = new DataView(ui8_data.buffer);
    //check last 7 bits of 4th byte for meta-data BLOCK type: must be STREAMINFO (0)
    if ((view.getUint8(offset) & 127 /* 0x7F */) != 0) {
        console.error("ERROR: wrong format for flac-file.");
        return false;
    }
    return true;
}
exports.flac_file_processing_check_flac_format = flac_file_processing_check_flac_format;
function to_string(ui8_data, start, end) {
    return String.fromCharCode.apply(null, ui8_data.subarray(start, end));
}
exports.to_string = to_string;
/**
 *  reads the paramaters of a wav-file - stored in a ui8array
 */
function wav_file_processing_read_parameters(ui8_data) {
    var sample_rate = 0, channels = 0, bps = 0, total_samples = 0, block_align;
    // get WAV/PCM parameters from data / file
    sample_rate = (((((ui8_data[27] << 8) | ui8_data[26]) << 8) | ui8_data[25]) << 8) | ui8_data[24];
    channels = ui8_data[22];
    bps = ui8_data[34];
    block_align = ui8_data[32];
    total_samples = ((((((ui8_data[43] << 8) | ui8_data[42]) << 8) | ui8_data[41]) << 8) | ui8_data[40]) / block_align;
    return {
        sample_rate: sample_rate,
        channels: channels,
        bps: bps,
        total_samples: total_samples,
        block_align: block_align
    };
}
exports.wav_file_processing_read_parameters = wav_file_processing_read_parameters;


/***/ })
/******/ ])));