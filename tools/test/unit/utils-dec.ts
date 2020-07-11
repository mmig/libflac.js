
import { Flac , StreamMetadata } from '../../../index.d';
import { interleave } from '../../../src/utils/wav-utils';

export function decode(flac: Flac, binData: Uint8Array, cb: (data: Uint8Array[][], metadata: StreamMetadata) => void, isDecPartial: boolean){

	const dec = flac.create_libflac_decoder(true);
	const wdata: Uint8Array[][] = [];
	let metadata: StreamMetadata | undefined= undefined;

	const size = binData.buffer.byteLength;
	let currentDataOffset: number = 0;
	flac.init_decoder_stream(dec, bufferSize => {

		const end = currentDataOffset === size? -1 : Math.min(currentDataOffset + bufferSize, size);

		if(end !== -1){
			const _buffer = binData.subarray(currentDataOffset, end);
			const numberOfReadBytes = end - currentDataOffset;

			currentDataOffset = end;

			return {buffer: _buffer, readDataLength: numberOfReadBytes, error: false};
		}

		return {buffer: undefined, readDataLength: 0};
	}, buffer => {
		wdata.push(buffer);
	}, (err, msg) => {
		throw new Error('ERROR during encoding: code '+err+' -> '+msg);
	}, m => {
		metadata = m;
	});
	// flac.setOptions(dec, {analyseSubframes: true, analyseResiduals: true});

	let status: boolean = true;
	let state: number = 0;
	if(isDecPartial){
		while(state <= 3 && status){

			status = flac.FLAC__stream_decoder_process_single(dec);
			//need to check decoder state: state == 4: end of stream ( > 4: error)
			state = flac.FLAC__stream_decoder_get_state(dec);
		}
	} else {
		status = flac.FLAC__stream_decoder_process_until_end_of_stream(dec);
		state = flac.FLAC__stream_decoder_get_state(dec);
	}

	if(!status){
		throw new Error('Error decoding chunk: FLAC__StreamDecoderState '+state);
	}

	flac.FLAC__stream_decoder_finish(dec);
	flac.FLAC__stream_decoder_delete(dec);

	cb(wdata, metadata as unknown as StreamMetadata);
}


export function decode2Interleaved(flac: Flac, binData: Uint8Array, cb: (data: Uint8Array, metadata: StreamMetadata) => void, isDecPartial: boolean){
	decode(flac, binData, (data, metadata) => {
		cb(interleave(data, metadata.channels, metadata.bitsPerSample), metadata);
	}, isDecPartial);
}
