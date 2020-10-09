
import { Flac, StreamMetadata , CompressionLevel } from '../../../index';
import { readdir, readdirSync, readFile } from 'fs-extra';
import { resolve } from 'path';

import { WaveFile } from 'wavefile';

import { wav_file_processing_convert_to32bitdata } from '../../../src/utils/wav-utils';
import { exportFlacData } from '../../../src/utils/flac-utils';

// import { writeFile } from "fs-extra";
// import { encodeWAV } from '../../../src/utils/wav-utils';

const testDataDir = __dirname + '/../temp/wav_test_files';

// export const libVariants = ['dev.asmjs'];
// const testFile = "D:/git_repo/libflac.js/tools/test/temp/wav_test_files/5sec_16-bit_44100Hz.wav";
// export function getTestWavFilesSync(): string[] {
// 	return [testFile];
// }

export const libVariants = ['release.asmjs', 'dev.asmjs', 'min.asmjs', 'release.wasm', 'dev.wasm', 'min.wasm'];

export async function getTestWavFiles(): Promise<string[]> {
	return readdir(testDataDir).then(files => files.filter(f => /\.wav$/i.test(f)).map(f => resolve(testDataDir, f)));
}

export function getTestWavFilesSync(): string[] {
	const files = readdirSync(testDataDir);
	return files.filter(f => /\.wav$/i.test(f)).map(f => resolve(testDataDir, f));
}

export function compareBuffers(buff1: Uint8Array, buff2: Uint8Array, offset1?: number, offset2?: number): string | undefined {
	offset1 = offset1 || 0;
	offset2 = offset2 || 0;
	const len = buff1.length;
	if(len - offset1 !== buff2.length - offset2){
		return 'different data length: buffer1[size: '+(len - offset1)+'] != buffer2[size: '+(buff2.length - offset2)+']';
	}
	for(var i=len-1; i >= 0; --i){
		if(buff1[i+offset1] !== buff2[i+offset2]){
			return 'different data at buffer1['+(i+offset1)+'] != buffer2['+(i+offset2)+']: ' + buff1[i+offset1]  +'!==' + buff2[i+offset2];
		}
	}
	return undefined;
}

export type EncodeDecodeCallback = (wavFileBin: Uint8Array, decodedWavData: Uint8Array) => void;
export type EncodeCallback = (data: Uint8Array[], metadata: StreamMetadata) => void;
export type TestEncodeFunc = (flac: Flac, sampleRate: number, channels: number, bps: number, compressionLevel: CompressionLevel, data: Int32Array, cb: EncodeCallback, encodeInterleaved: boolean) => void;
export type DecodeCallback = (data: Uint8Array) => void;
export type TestDecodeFunc = (flac: Flac, binData: Uint8Array, cb: DecodeCallback, decodePartial: boolean) => void;

export function runEncodeDecode(Flac: Flac, inFile: string, encFunc: TestEncodeFunc, decFunc: TestDecodeFunc, cb: EncodeDecodeCallback, useInterleavedEncoding: boolean, usePartialDecoding: boolean): void {

	readFile(inFile).then(data => {
		const wav = new WaveFile(data);
		const fmt: any = wav.fmt;

		// TODO WavFile returns incorrect data for 8-bit depth(?)
		const b32 = fmt.bitsPerSample !== 8?
			wav.getSamples(true, Int32Array) as unknown as Int32Array :
			wav_file_processing_convert_to32bitdata(data.buffer, fmt.bitsPerSample) as unknown as Int32Array;

		// console.log(wav.fmt)
		// console.log(wav.data)
		// console.log(b32)

		encFunc(Flac, fmt.sampleRate, fmt.numChannels, fmt.bitsPerSample, 5, b32, (encData: Uint8Array[], metadata: StreamMetadata) => {

			// console.log('encoded flac: ', metadata)

			exportFlacData(encData, metadata, false).then(flacData => {

				// console.log('exporting flac ['+encData[0].byteLength+'] -> ['+flacData.byteLength+']...', new DataView(flacData.buffer))
				// writeFile(inFile+'__TEST.flac', flacData);

				decFunc(Flac, flacData, binWavData => {
					// writeFile(inFile+'__TEST.wav', encodeWAV(binWavData, fmt.sampleRate, fmt.numChannels, fmt.bitsPerSample));
					cb(data, binWavData);
				}, usePartialDecoding);
			});
		}, useInterleavedEncoding);
	});
}

function getMultiMinMax(bitDepth: number) {
	switch(bitDepth) {
		case 8:
			return [ 0x7F, -128, 127 ];
		case 16:
			return [ 0x7FFF, -32768, 32767 ];
		case 24:
			return [ 0x7FFFFF, -8388608, 8388607 ];
		case 32:
			return [ 0x7FFFFFFF, -2147483648, 2147483647];
	}
	throw new Error(`Invalid bit depth`);
}

export function generateSineWave(
	frequency: number,
	seconds: number,
	samplingRate: number,
	bitDepth: number,
	amplitude: number = 1.0): Int32Array {

	const numSamples = samplingRate * seconds;
	const samples = new Int32Array(numSamples);

	const radsPerSample = 
		2 * Math.PI * frequency / samplingRate;
	let pos: number = 0;

	const [ multiplicator, minValue, maxValue ] = getMultiMinMax(bitDepth);
	const transform = (v: number) => Math.min(Math.max(Math.round(v * multiplicator), minValue), maxValue);

	for (let i = 0; i < numSamples; i++) {
		samples[i] = transform(Math.sin(pos) * amplitude);
		pos += radsPerSample;
	}

	return samples;
}

export interface TypedArray extends ArrayLike<number> {
    readonly length: number;
    set(array: ArrayLike<number>, offset?: number): void;
  }
  
export function concatTypedArrays<T extends TypedArray>(
    constructor: (new (count: number) => T), ...arrays: T[]) {
    arrays = arrays.filter(a => (a?.length ?? 0) > 0);
    
    const totalLength = arrays.reduce((sum, cur) => cur.length + sum, 0);
    const concatenated = new constructor(totalLength);
    let offset = 0;
    arrays.forEach(array => {
    concatenated.set(array, offset);
    offset += array.length;
    });
    return concatenated;
}
