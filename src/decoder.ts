
import { Flac, DestroyedEvent, decoder_read_callback_fn, decoder_write_callback_fn, decoder_error_callback_fn, metadata_callback_fn, StreamMetadata , ReadResult , FLAC__StreamDecoderState, CompletedReadResult , CodingOptions } from '../index.d';
import { interleave } from './utils/wav-utils';
import { mergeBuffers , getLength } from './utils/data-utils';
import { BeforeReadyHandler } from './before-ready-handler';

export interface DecoderOptions extends CodingOptions {
	verify?: boolean;
	isOgg?: boolean
	autoOnReady?: boolean;
}

type ChacheableDecoderCalls = '_init' | 'decode' | 'decodeChunk' | 'reset';

export class Decoder {

	private _id: number | undefined;
	private _isError: boolean = false;
	private _isInitialized: boolean = false;
	private _isFinished: boolean = false;

	private _beforeReadyHandler?: BeforeReadyHandler<Decoder, ChacheableDecoderCalls>;

	/**
	 * input cache for decoding-chunk modus
	 */
	private _inputCache: Uint8Array[] = [];
	/**
	 * the current reading offset within the current input chache chunk
	 */
	private _currentInputCacheOffset: number = -1;
	/**
	 * indicates that not enough data is cached for decoding the next chunk or
	 * decoding is currently in progress
	 */
	private _decodingChunkPaused: boolean = true;
	/**
	 * threshold for minimal amount of data (in bytes) that need to be cached,
	 * before triggering decoding the next data chunk
	 */
	private _min_data_decode_threshold: number = (4096 / 2);// NOTE: should be somewhat greater than 1024

	/**
	 * cache for the decoded data
	 */
	protected data: Uint8Array[][] = [];
	/**
	 * metadata for the decoded data
	 */
	private _metadata: StreamMetadata | undefined;

	private readonly _onDestroyed: (evt: DestroyedEvent) => void;
	private readonly _onRead: decoder_read_callback_fn;
	private readonly _onWrite: decoder_write_callback_fn;
	private readonly _onError: decoder_error_callback_fn;
	private readonly _onMetaData: metadata_callback_fn;
	/**
	 * will be (re-)set depending on decoding mode:
	 * either reading data as a whole, or reading data chunk-by-chunk
	 */
	private _onReadData?: decoder_read_callback_fn;

	public get initialized(): boolean {
		return this._isInitialized;
	}

	public get finished(): boolean {
		return this._isFinished;
	}

	public get metadata(): StreamMetadata | undefined {
		return this._metadata;
	}

	public get rawData(): Uint8Array[][] {
		return this.data;
	}

	public get isWaitOnReady(): boolean {
		return this._beforeReadyHandler?.isWaitOnReady || false;
	}

	constructor(private Flac: Flac, private _options: DecoderOptions = {}){
		this._id = Flac.create_libflac_decoder(_options.verify);
		this._onDestroyed = (evt: DestroyedEvent) => {
			if(evt.target.id === this._id){
				this._id = void(0);
				this._isInitialized = false;
				this._isFinished = false;
				Flac.off('destroyed', this._onDestroyed);
				if(this._beforeReadyHandler?.enabled){
					this._beforeReadyHandler.enabled = false;
				}
			}
		};
		Flac.on('destroyed', this._onDestroyed);

		this._onRead = (bufferSize: number): (ReadResult | CompletedReadResult) => {
			if(this._onReadData){
				return this._onReadData(bufferSize);
			}
			//if no read function is set, return error result:
			return {buffer: undefined, readDataLength: 0, error: true};
		}

		this._onWrite = (data: Uint8Array[]) => {
			this.addData(data);
		};

		this._onMetaData = (m?: StreamMetadata) => {
			if(m){
				this._metadata = m;
			}
		};

		this._onError = (code, description) => {
			this._isError = true;
			// TODO emit error instead!
			console.error(`Decoder[${this._id}] encoutered error (${code}): ${description}`);
		};

		if(this._options?.autoOnReady){
			this._beforeReadyHandler = new BeforeReadyHandler<Decoder, ChacheableDecoderCalls>(this, true, this.Flac);
		}

		if(this._id === 0){
			this._isError = true;
		} else {
			if(this._isAnalyse(this._options)){
				Flac.setOptions(this._id, this._options);
			}
			this._init(this._options.isOgg);
		}
	}

	private _init(isDecodeOgg?: boolean) : void {
		if(this._id){
			const state = isDecodeOgg?
				this.Flac.init_decoder_ogg_stream(this._id, this._onRead, this._onWrite, this._onError, this._onMetaData):
				this.Flac.init_decoder_stream(this._id, this._onRead, this._onWrite, this._onError, this._onMetaData);

			this._isError = state !== 0;
			if(state === 0){
				this._isInitialized = true;
				this._isFinished = false;
			}
		}else {
			this._handleBeforeReady('_init', arguments);
		}
	}

	/**
	 * reset decoder:
	 * resets internal state and clears cached input/output data.
	 */
	public reset(options?: DecoderOptions): boolean {
		if(this._id && !!this.Flac.FLAC__stream_decoder_reset(this._id)){
			if(options){

				Object.assign(this._options, options);
				this.Flac.setOptions(this._id, this._options);

				const isVerify = this.Flac.FLAC__stream_decoder_get_md5_checking(this._id);
				if(typeof this._options.verify !== 'undefined' && isVerify != /*non-exact comparision*/ this._options.verify){
					this.Flac.FLAC__stream_decoder_set_md5_checking(this._id, !!this._options.verify);
				}
			}
			this._resetInputCache();
			this.clearData();
			this._metadata = undefined;
			this._onReadData = undefined;
			this._isInitialized = false;
			this._isFinished = false;

			this._init(this._options.isOgg);
			return this._isError;
		}
		return this._handleBeforeReady('reset', arguments);
	}

	/**
	 * decode all data at once (will automatically finishes decoding)
	 *
	 * **NOTE**: do not mix with [[decodeChunk]] calls!
	 *
	 * @param  flacData the (complete) FLAC data to decode
	 * @return `true` if encoding was successful
	 */
	public decode(flacData: Uint8Array): boolean {
		if(this._id && this._isInitialized && !this._isFinished){
			this._onReadData = this._createReadFunc(flacData);
			if(!!this.Flac.FLAC__stream_decoder_process_until_end_of_stream(this._id)){
				return this._finish();
			};
			return false;
		}
		return this._handleBeforeReady('decode', arguments);
	}

	/** finish decoding */
	public decodeChunk(): boolean;
	/**
	 * decode next chunk of data:
	 * if not enough data for decoding is cached, will pause until enough data
	 * is cached, or flushing of the cache is forced.
	 *
	 * @param  flacData the data chunk to decode:
	 *                    if omitted, will finish the decoding (any cached data will be flushed).
	 * @return `true` if encoding was successful
	 */
	public decodeChunk(flacData: Uint8Array): boolean;
	/**
	 * decode next chunk of data:
	 * if not enough data for decoding is cached, will pause until enough data
	 * is cached, or flushing of the cache is forced.
	 *
	 * **NOTE**: do not mix with [[decode]] calls!
	 *
	 * @param  [flacData] the data chunk to decode:
	 *                    if omitted, will finish the decoding (any cached data will be flushed).
	 * @param  [flushCache] flush the cached data and finalize decoding
	 * @return `true` if encoding was successful
	 */
	public decodeChunk(flacData?: Uint8Array, flushCache?: boolean): boolean {
		if (this._id && this._isInitialized && !this._isFinished) {

			if (!this._onReadData) {
				this._onReadData = this._createReadChunkFunc();
			}

			if(typeof flacData === 'boolean'){
				flushCache = true;
				flacData = void(0);
			}

			if(flacData){
				this._addInputChunk(flacData);
			} else {
				flushCache = true;
			}

			if(!flushCache && !this._decodingChunkPaused){
				//decoding in progress -> do nothing
				return true;
			}

			if (!flushCache && !this._canReadChunk()) {
				//if there is not enough buffered data yet, do wait
				return true;
			}

			// console.log('decodingPaused ' + this._decodingChunkPaused);//debug
			this._decodingChunkPaused = false;

			//request to decode data chunks until end-of-stream is reached (or decoding is paused):
			let decState: FLAC__StreamDecoderState = 0;
			while (!this._decodingChunkPaused && decState <= 3) {
				if(!this.Flac.FLAC__stream_decoder_process_single(this._id)){
					return false;
				}
				decState = this.Flac.FLAC__stream_decoder_get_state(this._id);
			}

			if(flushCache){
				return this._finish();
			} else {
				return true;
			}
		}
		return this._handleBeforeReady('decodeChunk', arguments);
	}

	/**
	 * get non-interleaved (WAV) samples:
	 * the returned array length corresponds to the number of channels
	 */
	public getSamples(): Uint8Array[];
	/**
	 * get non-interleaved (raw PCM) samples:
	 * the returned array length corresponds to the number of channels
	 */
	public getSamples(isInterleaved: false): Uint8Array[];
	/**
	 * get interleaved samples:
	 * the returned array length corresponds to the number of channels
	 */
	public getSamples(isInterleaved: true): Uint8Array;
	/**
	 * get the decoded samples
	 * @param  isInterleaved if `true` interleaved WAV samples are returned,
	 * 						otherwise, an array of the (raw) PCM samples will be returned
	 * 						where the length of the array corresponds to the number of channels
	 * @return the samples: either interleaved as `Uint8Array` or non-interleaved
	 *         as `Uint8Array[]` with the array's length corresponding to the number of channels
	 */
	public getSamples(isInterleaved?: boolean): Uint8Array[] | Uint8Array {
		if(this.metadata){
			isInterleaved = !!isInterleaved;
			const channels = this.metadata.channels;

			if(isInterleaved){
				return interleave(this.data, channels, this.metadata.bitsPerSample);
			}

			const data: Uint8Array[] = new Array(channels);
			for(let i=channels-1; i >= 0; --i){
				const chData = this.mapData(d => d[i]);
				data[i] = mergeBuffers(chData, getLength(chData));
			}
			return data;
		}
		throw new Error('Metadata not available');
	}

	public getState(): FLAC__StreamDecoderState | -1 {
		if(this._id){
			return this.Flac.FLAC__stream_decoder_get_state(this._id);
		}
		return -1;
	}

	public destroy(): void {
		if(this._id){
			this.Flac.FLAC__stream_decoder_delete(this._id);
		}
		this._beforeReadyHandler && (this._beforeReadyHandler.enabled = false);
		this._metadata = void(0);
		this.clearData();
		this._inputCache.splice(0);
	}

	protected addData(decData: Uint8Array[]): void {
		this.data.push(decData);
	}

	protected clearData(): void {
		this.data.splice(0);
	}

	protected mapData(mapFunc: (val: Uint8Array[], index: number, list: Uint8Array[][]) => Uint8Array): Uint8Array[] {
		return this.data.map(mapFunc);
	}

	private _isAnalyse(opt: DecoderOptions){
		return opt.analyseResiduals || opt.analyseSubframes;
	}

	private _finish(): boolean {
		if(this._id && this._isInitialized && !this._isFinished){
			if(!!this.Flac.FLAC__stream_decoder_finish(this._id)){
				this._isFinished = true;
				return true;
			};
		}
		return false;
	}

	private _createReadFunc(binData: Uint8Array): decoder_read_callback_fn {
		this._resetInputCache();
		const size = binData.buffer.byteLength;
		let currentDataOffset: number = 0;
		return (bufferSize: number): (ReadResult | CompletedReadResult) => {

			const end = currentDataOffset === size? -1 : Math.min(currentDataOffset + bufferSize, size);

			if(end !== -1){
				const _buffer = binData.subarray(currentDataOffset, end);
				const numberOfReadBytes = end - currentDataOffset;

				currentDataOffset = end;

				return {buffer: _buffer, readDataLength: numberOfReadBytes, error: false};
			}

			return {buffer: undefined, readDataLength: 0};
		}
	}

	private _addInputChunk(data: Uint8Array): void {
		this._inputCache.push(data)
	}

	private _canReadChunk(): boolean {
		return getLength(this._inputCache) >= this._min_data_decode_threshold;
	}

	private _resetInputCache(): void {
		this._decodingChunkPaused = true;
		this._currentInputCacheOffset = -1;
		if(this._inputCache.length > 0){
			this._inputCache.splice(0);
		}
	}

	private _createReadChunkFunc(): decoder_read_callback_fn {
		this._resetInputCache();
		this._currentInputCacheOffset = 0;
		return (bufferSize: number): (ReadResult | CompletedReadResult) => {

			// console.log('_readChunk: '+bufferSize, this._inputCache);

			if (!this._inputCache.length) {
				return {
					buffer: undefined,
					readDataLength: 0,
					error: false
				};
			}

			const chunk = this._inputCache[0];
			const size = chunk.buffer.byteLength;

			const start = this._currentInputCacheOffset;
			const end = start === size ? -1 : Math.min(start + bufferSize, size);

			let _buffer: Uint8Array | undefined;
			let numberOfReadBytes: number;
			if (end !== -1) {

				// console.log('_readChunk: reading ['+start+', '+end+'] ');
				_buffer = chunk.subarray(start, end);
				numberOfReadBytes = end - start;

				this._currentInputCacheOffset = end;
			} else {
				numberOfReadBytes = 0;
			}
			// console.log('numberOfReadBytes', numberOfReadBytes);

			if (numberOfReadBytes < bufferSize) {
				//use next buffered data-chunk for decoding:

				this._inputCache.shift(); //<- remove first (i.e. active) data-chunk from buffer
				const nextSize = this._inputCache.length > 0 ? this._inputCache[0].buffer.byteLength : 0;
				this._currentInputCacheOffset = 0;

				if (nextSize === 0) {
					// console.log('_readChunk: setting canDecodeNextChunk -> false');// debug
					this._decodingChunkPaused = true; //<- set to "pause" if no more data is available
				}
			}

			// console.log('_readChunk: returning ', numberOfReadBytes, _buffer);
			return {
				buffer: _buffer as unknown as Uint8Array,
				readDataLength: numberOfReadBytes,
				error: false
			};
		}
	}

	private _handleBeforeReady(funcName: ChacheableDecoderCalls, args: ArrayLike<any>): boolean {
		if(this._beforeReadyHandler){
			return this._beforeReadyHandler.handleBeforeReady(funcName, args);
		}
		return false;
	}
}
