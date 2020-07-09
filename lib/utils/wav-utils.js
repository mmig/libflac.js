"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportWavFile = exports.writeData = exports.writeString = exports.encodeWAV = exports.interleave = exports.wav_file_processing_convert_to32bitdata = void 0;
const data_utils_1 = require("./data-utils");
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
