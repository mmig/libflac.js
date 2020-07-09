import * as libFactory from "../../../index";

import {assert} from "chai"
import { libVariants } from './utils';

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

})
