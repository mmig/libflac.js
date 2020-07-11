import { Flac, StreamMetadata, FLAC__StreamDecoderState, CodingOptions } from '../index.d';
export interface DecoderOptions extends CodingOptions {
    verify?: boolean;
    isOgg?: boolean;
    autoOnReady?: boolean;
}
export declare class Decoder {
    private Flac;
    private _options;
    private _id;
    private _isError;
    private _isInitialized;
    private _isFinished;
    private _beforeReadyHandler?;
    /**
     * input cache for decoding-chunk modus
     */
    private _inputCache;
    /**
     * the current reading offset within the current input chache chunk
     */
    private _currentInputCacheOffset;
    /**
     * indicates that not enough data is cached for decoding the next chunk or
     * decoding is currently in progress
     */
    private _decodingChunkPaused;
    /**
     * threshold for minimal amount of data (in bytes) that need to be cached,
     * before triggering decoding the next data chunk
     */
    private _min_data_decode_threshold;
    /**
     * cache for the decoded data
     */
    protected data: Uint8Array[][];
    /**
     * metadata for the decoded data
     */
    private _metadata;
    private readonly _onDestroyed;
    private readonly _onRead;
    private readonly _onWrite;
    private readonly _onError;
    private readonly _onMetaData;
    /**
     * will be (re-)set depending on decoding mode:
     * either reading data as a whole, or reading data chunk-by-chunk
     */
    private _onReadData?;
    get initialized(): boolean;
    get finished(): boolean;
    get metadata(): StreamMetadata | undefined;
    get rawData(): Uint8Array[][];
    get isWaitOnReady(): boolean;
    constructor(Flac: Flac, _options?: DecoderOptions);
    private _init;
    /**
     * reset decoder:
     * resets internal state and clears cached input/output data.
     */
    reset(options?: DecoderOptions): boolean;
    /**
     * decode all data at once (will automatically finishes decoding)
     *
     * **NOTE**: do not mix with [[decodeChunk]] calls!
     *
     * @param  flacData the (complete) FLAC data to decode
     * @return `true` if encoding was successful
     */
    decode(flacData: Uint8Array): boolean;
    /** finish decoding */
    decodeChunk(): boolean;
    /**
     * decode next chunk of data:
     * if not enough data for decoding is cached, will pause until enough data
     * is cached, or flushing of the cache is forced.
     *
     * @param  flacData the data chunk to decode:
     *                    if omitted, will finish the decoding (any cached data will be flushed).
     * @return `true` if encoding was successful
     */
    decodeChunk(flacData: Uint8Array): boolean;
    /**
     * get non-interleaved (WAV) samples:
     * the returned array length corresponds to the number of channels
     */
    getSamples(): Uint8Array[];
    /**
     * get non-interleaved (raw PCM) samples:
     * the returned array length corresponds to the number of channels
     */
    getSamples(isInterleaved: false): Uint8Array[];
    /**
     * get interleaved samples:
     * the returned array length corresponds to the number of channels
     */
    getSamples(isInterleaved: true): Uint8Array;
    getState(): FLAC__StreamDecoderState | -1;
    destroy(): void;
    protected addData(decData: Uint8Array[]): void;
    protected clearData(): void;
    protected mapData(mapFunc: (val: Uint8Array[], index: number, list: Uint8Array[][]) => Uint8Array): Uint8Array[];
    private _isAnalyse;
    private _finish;
    private _createReadFunc;
    private _addInputChunk;
    private _canReadChunk;
    private _resetInputCache;
    private _createReadChunkFunc;
    private _handleBeforeReady;
}
