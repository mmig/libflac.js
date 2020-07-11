import * as libFactory from '../../../index';
import { Flac, StreamMetadata , CompressionLevel } from '../../../index';

import { assert } from 'chai';

import { basename } from 'path';


import { getTestWavFilesSync , compareBuffers , runEncodeDecode } from './utils';

import { Decoder } from '../../../src/decoder';
import { Encoder } from '../../../src/encoder';

import { deinterleave } from './utils-enc';

describe("encode/decode with utility classes", function() {

	describe("round trip encode/decode with utility classes", function() {

		const files: string[] = getTestWavFilesSync();
		const timeout = 3000;
		const libVariant = 'wasm.min';

		let Flac: Flac;
		before(function () {
			Flac = libFactory(libVariant);
			return new Promise(resolve => {
				Flac.onready = () => resolve();
			});
		});

		describe("utility classes should create same wav data", function () {

			files.forEach(inFile => {

				it(`for test file ${basename(inFile)}`, function (cb) {

					this.timeout(timeout);
					runEncodeDecode(Flac, inFile, encode, decode, (fileWavData, binWavData) => {
						const result = compareBuffers(fileWavData, binWavData, 44, 0);
						assert.isUndefined(result, result);
						cb();
					}, true, false);
				});
			});
		});

		describe("utility classes should create same wav data for encoding/decoding modes", function () {

			const inFile = files[files.length - 1];

			[true, false].forEach(useInterleavedEncoding => {

				[true, false].forEach(usePartialDecoding => {

					const interleaveMode = useInterleavedEncoding? 'interleaved' : 'non-interleaved';
					const decodeMode = usePartialDecoding? 'chunked' : 'as-single-chunk';

					it(`for test file ${basename(inFile)} when encoding ${interleaveMode} and decoding ${decodeMode}`, function (cb) {

						this.timeout(timeout);
						runEncodeDecode(Flac, inFile, encode, decode, (fileWavData, binWavData) => {
							const result = compareBuffers(fileWavData, binWavData, 44, 0);
							assert.isUndefined(result, result);
							cb();
						}, useInterleavedEncoding, usePartialDecoding);
					});
				});
			});
		});

	})
});

function encode(flac: Flac, sampleRate: number, channels: number, bps: number, compressionLevel: CompressionLevel, data: Int32Array, cb: (data: Uint8Array[], metadata: StreamMetadata) => void, encodeInterleaved: boolean): void {

	const encoder = new Encoder(flac, {
		sampleRate: sampleRate,
		channels: channels,
		bitsPerSample: bps,
		compression: compressionLevel,
		verify: true
	});

	if(encodeInterleaved){

		encoder.encode(data);

	} else {

		//de-interleave data into channels-array:
		const list: Int32Array[] = deinterleave(data, channels);
		encoder.encode(list);
	}
	encoder.encode();

	const encData = encoder.getSamples();
	const metadata: StreamMetadata = encoder.metadata as StreamMetadata;

	encoder.destroy();

	cb([encData], metadata as unknown as StreamMetadata);
}

function decode(flac: Flac, binData: Uint8Array, cb: (data: Uint8Array) => void, decodePartial: boolean){

	const decoder = new Decoder(flac, {verify: true});
	if(!decodePartial){
		decoder.decode(binData);
	} else {
		decoder.decodeChunk(binData);
		decoder.decodeChunk();
	}
	const decData = decoder.getSamples(true);
	decoder.destroy();
	cb(decData);
}
