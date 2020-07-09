
import { Flac , StreamMetadata, CompressionLevel } from '../../../index.d';

export function encode(flac: Flac, sampleRate: number, channels: number, bps: number, compressionLevel: CompressionLevel, data: Int32Array, cb: (data: Uint8Array[], metadata: StreamMetadata) => void, encodeInterleaved: boolean): void {

	const enc = flac.create_libflac_encoder(sampleRate, channels, bps, compressionLevel);
	const fdata: Uint8Array[] = [];
	let metadata: StreamMetadata | null = null;
	flac.init_encoder_stream(enc, (data: Uint8Array) => {
		// console.log('write data: ', data);
		fdata.push(data);
	}, (m: StreamMetadata) => {
		// console.log('metadata: ', m);
		metadata = m;
	});

	if(!encodeInterleaved){

		// separate interleaved data into channels
		const list: Int32Array[] = deinterleave(data, channels);
		flac.FLAC__stream_encoder_process(enc, list, data.length/channels);

	} else {

		flac.FLAC__stream_encoder_process_interleaved(enc, data, data.length/channels);
	}

	flac.FLAC__stream_encoder_finish(enc);
	flac.FLAC__stream_encoder_delete(enc);

	cb(fdata, metadata as unknown as StreamMetadata);
}

export function deinterleave(data: Int32Array, channels: number): Int32Array[] {

	const len = data.length;
	const samples = len / channels;
	const list: Int32Array[] = new Array(channels).fill(null).map(() => new Int32Array(samples));
	for(var i=0; i < len; i+=channels){
		for(var j=0; j < channels; ++j){
			list[j][i/channels] = data[i+j];
		}
	}
	return list;
}
