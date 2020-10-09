import * as libFactory from "../../../index";
import { Flac } from '../../../index';

import {assert} from "chai"

import { libVariants, generateSineWave, concatTypedArrays } from './utils';
import { encode } from "./utils-enc";
import { decode } from "./utils-dec";

describe("Flac", function() {
	describe("exports", function() {
		it("should include functions and properties", function() {
			const expected = [
				/* Utility functions. */
				"on",
				"off",
				"isReady",
				"onready",
				"setOptions",
				"getOptions",

				/* Encoding functions. */
				"create_libflac_encoder",
				"init_libflac_encoder",
				"init_encoder_stream",
				"init_encoder_ogg_stream",
				"FLAC__stream_encoder_set_verify",
				"FLAC__stream_encoder_set_compression_level",
				"FLAC__stream_encoder_set_blocksize",
				"FLAC__stream_encoder_process_interleaved",
				"FLAC__stream_encoder_process",
				"FLAC__stream_encoder_get_state",
				"FLAC__stream_encoder_get_verify_decoder_state",
				"FLAC__stream_encoder_get_verify",
				"FLAC__stream_encoder_set_metadata",
				"FLAC__stream_encoder_finish",
				"FLAC__stream_encoder_delete",

				/* Decoding functions. */
				"create_libflac_decoder",
				"init_libflac_decoder",
				"init_decoder_stream",
				"init_decoder_ogg_stream",
				"FLAC__stream_decoder_process_single",
				"FLAC__stream_decoder_process_until_end_of_stream",
				"FLAC__stream_decoder_process_until_end_of_metadata",
				"FLAC__stream_decoder_set_md5_checking",
				"FLAC__stream_decoder_get_state",
				"FLAC__stream_decoder_get_md5_checking",
				"FLAC__stream_decoder_set_metadata_respond",
				"FLAC__stream_decoder_set_metadata_respond_application",
				"FLAC__stream_decoder_set_metadata_respond_all",
				"FLAC__stream_decoder_set_metadata_ignore",
				"FLAC__stream_decoder_set_metadata_ignore_application",
				"FLAC__stream_decoder_set_metadata_ignore_all",
				"FLAC__stream_decoder_finish",
				"FLAC__stream_decoder_reset",
				"FLAC__stream_decoder_delete",

				/* Members only present in Node.js. */
				"variant"
			]

			const Flac = libFactory();
			const publicMembers = Object.keys(Flac).filter(m => !/^_/.test(m));

			assert.sameMembers(publicMembers, expected)
		})
	})

	describe("factory instance", function() {

		libVariants.forEach(variant => {

			it(`should be able to return library variant ${variant}`, function() {

				const flac = libFactory(variant);
				assert.equal(variant, flac.variant);
			});
		})

	})

	describe("factory intialization", function() {

		libVariants.forEach(variant => {

			it(`should be able to initialize library variant ${variant}`, function(cb) {

				const flac = libFactory(variant);
				assert.equal(variant, flac.variant);
				flac.onready = () => {
					assert.isTrue(flac.isReady());
					flac.onready = undefined;
					cb();
				}
			});
		})

	})

	describe("ready event", function() {

		libVariants.forEach(variant => {

			it(`should be emitted when initialization as finished for library variant ${variant}`, function(cb) {

				const onready = () => {
					assert.isTrue(flac.isReady());
					flac.off('ready', onready);
					cb();
				};
				const flac = libFactory(variant);
				flac.on('ready', onready);
			});
		})

	})

	describe("chunked decode test with temporary out-of-data", function() {

		libVariants.forEach(variant => {
			let Flac: Flac;
			before(function () {
				Flac = libFactory(variant);
				return new Promise(resolve => {
					Flac.onready = () => resolve();
				});
			});
			[1000, 100, 10].forEach(chunkSize => {
				it(`should decode correctly when fed with small data chunks of ${chunkSize} bytes. lib variant is ${variant}`, function(cb) {
					const samplingRate = 48000; 
					const bitDepth = 16;

					const sineWave = generateSineWave(400, 10, samplingRate, bitDepth, 0.8);

					const encodedChunks: Uint8Array[] = [];
					encode(Flac, samplingRate, 1, bitDepth, 5, sineWave, data => encodedChunks.push(...data), true);
					const encoded = concatTypedArrays(Uint8Array, ...encodedChunks);

					const decodedChannelChunks: Uint8Array[][] = [];

					let counter = 0;
					decode(Flac, encoded, data => decodedChannelChunks.push(...data), true, num => {
						// every 10th time a chunk is requested, return 0 bytes to simulate temporary stalling.
						return (++counter % 10 === 0) ? 0 : Math.min(num, chunkSize)
					});

					assert.isTrue(decodedChannelChunks.every(u => u.length === 1));
					const decodedChunks = decodedChannelChunks.map(c => c[0]);
					const decodedBinary = concatTypedArrays(Uint8Array, ...decodedChunks);
					assert.equal(decodedBinary.length % (bitDepth / 8), 0);
					const decoded = new Int16Array(decodedBinary.buffer, decodedBinary.byteOffset, decodedBinary.length / (bitDepth / 8));

					assert.equal(decoded.length, sineWave.length);
					for (let i = 0; i < sineWave.length; i++) {
						if (sineWave[i] != decoded[i]) {
							assert.equal(decoded[i], sineWave[i], `At position ${i}`);
						}
					}
					cb();
				});
			});
		})

	})


})
