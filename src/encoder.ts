
import { Flac, DestroyedEvent, CompressionLevel, encoder_write_callback_fn, metadata_callback_fn, StreamMetadata , FLAC__StreamEncoderState, CodingOptions } from '../index.d';
import { mergeBuffers , getLength } from './utils/data-utils';

export interface EncoderOptions extends EncoderResetOptions {
	sampleRate: number;
	channels: number;
	bitsPerSample: number;
	compression: CompressionLevel;
	totalSamples?: number;
}

export interface EncoderResetOptions extends CodingOptions {
	// sampleRate?: number;
	// channels?: number;
	// bitsPerSample?: number;
	compression?: CompressionLevel;
	// totalSamples?: number;
	verify?: boolean;
	isOgg?: boolean;
}

export class Encoder {

	private _id: number | undefined;
	private _isError: boolean = false;
	private _isInitialized: boolean = false;
	private _isFinished: boolean = false;

	/**
	 * cache for the encoded data
	 */
	private _data: Uint8Array[] = [];
	/**
	 * metadata for the encoded data
	 */
	private _metadata: StreamMetadata | undefined;

	private readonly _onDestroyed: (evt: DestroyedEvent) => void;
	private readonly _onWrite: encoder_write_callback_fn;
	private readonly _onMetaData: metadata_callback_fn;

	public get initialized(): boolean {
		return this._isInitialized;
	}

	public get finished(): boolean {
		return this._isFinished;
	}

	public get metadata(): StreamMetadata | undefined {
		return this._metadata;
	}

	public get rawData(): Uint8Array[] {
		return this._data;
	}

	constructor(private Flac: Flac, private _options: EncoderOptions){
		this._id = Flac.create_libflac_encoder(_options.sampleRate, _options.channels, _options.bitsPerSample, _options.compression, _options.totalSamples, _options.verify);
		this._onDestroyed = (evt: DestroyedEvent) => {
			if(evt.target.id === this._id){
				this._id = void(0);
				this._isInitialized = false;
				this._isFinished = false;
				Flac.off('destroyed', this._onDestroyed);
			}
		};
		Flac.on('destroyed', this._onDestroyed);

		this._onWrite = (data: Uint8Array) => {
			this._data.push(data);
		};

		this._onMetaData = (m: StreamMetadata) => {
			this._metadata = m;
		};

		if(this._id === 0){
			this._isError = true;
		} else {
			// if(this._isAnalyse(this._options)){
			// 	Flac.setOptions(this._id, this._options);
			// }
			this._init(this._options.isOgg);
		}
	}

	private _init(isEncodeOgg?: boolean) : void {
		if(this._id){
			const state = isEncodeOgg?
				this.Flac.init_encoder_ogg_stream(this._id, this._onWrite, this._onMetaData):
				this.Flac.init_encoder_stream(this._id, this._onWrite, this._onMetaData);

			this._isError = state !== 0;
			if(state === 0){
				this._isInitialized = true;
				this._isFinished = false;
			}
		}
	}

	/**
	 * reset encoder:
	 * resets internal state and clears cached input/output data.
	 */
	public reset(options?: EncoderResetOptions): boolean {
		if(this._id){

			// do reset encoder, if it was initialized -> call finished()
			let state: FLAC__StreamEncoderState = this.Flac.FLAC__stream_encoder_get_state(this._id);
			if(state === /* FLAC__STREAM_ENCODER_OK */ 0){
				this.Flac.FLAC__stream_encoder_finish(this._id);
				state = this.Flac.FLAC__stream_encoder_get_state(this._id);
			}

			if(state === /* FLAC__STREAM_ENCODER_UNINITIALIZED */ 1){

				if(options){

					Object.assign(this._options, options);
					// if(this._isAnalyse(this._options)){
					// 	Flac.setOptions(this._id, this._options);
					// }

					if(typeof options.verify !== 'undefined' && this.Flac.FLAC__stream_encoder_get_verify(this._id) != /*non-exact comparision*/ this._options.verify){
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
					if(typeof options.compression !== 'number'){
						this.Flac.FLAC__stream_encoder_set_compression_level(this._id, this._options.compression);
					}
				}
				this._data.splice(0);
				this._metadata = undefined;
				this._isInitialized = false;
				this._isFinished = false;

				this._init(this._options.isOgg);
				return this._isError;
			}
		}
		return false;
	}

	/** finish encoding: the encoder needs to be reset or destroyed afterwards. */
	public encode(): boolean;
	/**
	 * encode PCM data as an array of channels to FLAC
	 * @param  pcmData the PCM data (array of the channels)
	 * @param  numberOfSamples the number of samples (for one channel): if omitted, the number will be calculated using the first channel in <code>pcmData</code>
	 * @return <code>true</code> if encoding was successful
	 *
	 * @throws Error in case non-interleaved encoding data did not match the number of expected channels
	 */
	public encode(pcmData: Int32Array[], numberOfSamples?: number): boolean;
	/**
	 * encode PCM data as an array of channels to FLAC
	 * @param  pcmData the PCM data (array of the channels)
	 * @param  numberOfSamples the number of samples (for one channel): if omitted, the number will be calculated using the first channel in <code>pcmData</code>
	 * @param  isInterleaved <code>false</code>
	 * @return <code>true</code> if encoding was successful
	 *
	 * @throws Error in case non-interleaved encoding data did not match the number of expected channels
	 */
	public encode(pcmData: Int32Array[], numberOfSamples: number | undefined, isInterleaved: false): boolean;
	/**
	 * encode interleaved PCM data to FLAC
	 * @param  pcmData the PCM data (interleaved: one sample for each channel)
	 * @param  numberOfSamples the number of samples (for one channel): if omitted, the number will be calculated using <code>options.channels</code> on <code>pcmData</code>
	 * @return <code>true</code> if encoding was successful
	 *
	 * @throws Error in case non-interleaved encoding data did not match the number of expected channels
	 */
	public encode(pcmData: Int32Array, numberOfSamples?: number): boolean;
	/**
	 * encode interleaved PCM data to FLAC
	 * @param  pcmData the PCM data (interleaved: one sample for each channel)
	 * @param  numberOfSamples the number of samples (for one channel): if omitted, the number will be calculated using <code>options.channels</code> on <code>pcmData</code>
	 * @param  isInterleaved <code>true</code>
	 * @return <code>true</code> if encoding was successful
	 *
	 * @throws Error in case non-interleaved encoding data did not match the number of expected channels
	 */
	public encode(pcmData: Int32Array, numberOfSamples: number | undefined, isInterleaved: true): boolean;
	/**
	 * encode PCM data to FLAC
	 * @param  pcmData the PCM data: either interleaved, or an array of the channels
	 * @param  numberOfSamples the number of samples (for one channel)
	 * @param  isInterleaved if the PCM data is interleaved or an array of channel PCM data
	 * @return <code>true</code> if encoding was successful
	 *
	 * @throws Error in case non-interleaved encoding data did not match the number of expected channels
	 */
	public encode(pcmData?: Int32Array | Int32Array[], numberOfSamples?: number, isInterleaved?: boolean): boolean {
		if(this._id && this._isInitialized && !this._isFinished){

			// console.log('encoding with ', this._options, pcmData);

			if(typeof pcmData === 'undefined'){
				// console.log('finish encoding...');
				return this._finish();
			}

			if(typeof isInterleaved === 'undefined'){
				// console.log('determining interleaved ...');
				isInterleaved = !(Array.isArray(pcmData) && pcmData[0] instanceof Int32Array);
				// console.log('is interleaved?: ', isInterleaved);
			}

			if(typeof numberOfSamples === 'undefined'){
				// console.log('calculating numberOfSamples...');
				// const byteNum = this._options.bitsPerSample / 8;
				const buff = isInterleaved? (pcmData as Int32Array) : (pcmData as Int32Array[])[0];
				// console.log('calculating numberOfSamples: byteNum='+byteNum+' for buffer ', buff);
				numberOfSamples = (buff.byteLength - buff.byteOffset) / ((isInterleaved? this._options.channels : 1) * buff.BYTES_PER_ELEMENT);// * byteNum);
			}

			if(isInterleaved){
				// console.log('encoding interleaved ('+numberOfSamples+' samples)...');
				return !!this.Flac.FLAC__stream_encoder_process_interleaved(this._id, pcmData as Int32Array, numberOfSamples);
			}
			// ASSERT encode non-interleaved
			if(this._options.channels !== pcmData.length){
				throw new Error(`Wrong number of channels: expected ${this._options.channels} but got ${pcmData.length}`)
			}
			// console.log('encoding non-interleaved ('+numberOfSamples+' samples)...');
			return !!this.Flac.FLAC__stream_encoder_process(this._id, pcmData as Int32Array[], numberOfSamples);
		}
		return false;
	}

	public getSamples(): Uint8Array {
		return mergeBuffers(this._data, getLength(this._data));
	}

	public getState(): FLAC__StreamEncoderState | -1 {
		if(this._id){
			return this.Flac.FLAC__stream_encoder_get_state(this._id);
		}
		return -1;
	}

	public destroy(): void {
		if(this._id){
			this.Flac.FLAC__stream_encoder_delete(this._id);
		}
	}

	private _finish(): boolean {
		if(this._id && this._isInitialized && !this._isFinished){
			if(!!this.Flac.FLAC__stream_encoder_finish(this._id)){
				this._isFinished = true;
				return true;
			};
		}
		return false;
	}

}
