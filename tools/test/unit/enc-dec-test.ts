import * as libFactory from '../../../index';
import { Flac } from '../../../index';

import {assert} from 'chai';

import {basename} from 'path';

import { getTestWavFilesSync , compareBuffers , libVariants , runEncodeDecode } from './utils';

// import {writeFile} from "fs-extra";
// import { encodeWAV } from '../../../src/utils/wav-utils';
import { decode2Interleaved } from './utils-dec';
import { encode } from './utils-enc';

describe("encode/decode", function() {

	describe("round trip encode/decode", function() {

		const files: string[] = getTestWavFilesSync();
		const timeout = 3000;

		describe("should create same wav data", function () {

			// ['release', 'dev', 'min', 'release.wasm', 'dev.wasm', 'min.wasm'].forEach(variant => {
			libVariants.forEach(variant => {

				let Flac: Flac;

				beforeEach(function () {
					Flac = libFactory(variant);
					const init = new Promise(resolve => {
						Flac.onready = () => resolve();
					});

					// return Promise.all([init, getTestWavFiles().then(list => (files=list))]);
					return init;
				});

				files.forEach(inFile => {

					it(`using ${variant} for test file ${basename(inFile)}`, function (cb) {

						this.timeout(timeout);
						runEncodeDecode(Flac, inFile, encode, decode2Interleaved, (fileWavData, binWavData) => {
							const result = compareBuffers(fileWavData, binWavData, 44, 0);
							assert.isUndefined(result, result);
							cb();
						}, true, false);
					});
				});
			});
		});

		describe("should create same wav data for encoding/decoding modes", function () {

			// ['release', 'dev', 'min', 'release.wasm', 'dev.wasm', 'min.wasm'].forEach(variant => {
			libVariants.forEach(variant => {

				let Flac: Flac;
				before(function () {
					Flac = libFactory(variant);
					return new Promise(resolve => {
						Flac.onready = () => resolve();
					});
				});


				const inFile = files[files.length - 1];

				[true, false].forEach(useInterleavedEncoding => {

					[true, false].forEach(usePartialDecoding => {

						const interleaveMode = useInterleavedEncoding? 'interleaved' : 'non-interleaved';
						const decodeMode = usePartialDecoding? 'chunked' : 'as-single-chunk';

						it(`for test file ${basename(inFile)} when encoding ${interleaveMode} and decoding ${decodeMode}`, function (cb) {

							this.timeout(timeout);
							runEncodeDecode(Flac, inFile, encode, decode2Interleaved, (fileWavData, binWavData) => {
								const result = compareBuffers(fileWavData, binWavData, 44, 0);
								assert.isUndefined(result, result);
								cb();
							}, useInterleavedEncoding, usePartialDecoding);
						});
					});
				});
			});
		});
	})
});
