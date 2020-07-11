import { Flac, CompressionLevel, StreamMetadata, FLAC__StreamEncoderState, CodingOptions } from '../index.d';
export interface EncoderOptions extends EncoderResetOptions {
    sampleRate: number;
    channels: number;
    bitsPerSample: number;
    compression: CompressionLevel;
    totalSamples?: number;
    autoOnReady?: boolean;
}
export interface EncoderResetOptions extends CodingOptions {
    compression?: CompressionLevel;
    verify?: boolean;
    isOgg?: boolean;
}
export declare class Encoder {
    private Flac;
    private _options;
    private _id;
    private _isError;
    private _isInitialized;
    private _isFinished;
    private _beforeReadyHandler?;
    /**
     * cache for the encoded data
     */
    protected data: Uint8Array[];
    /**
     * metadata for the encoded data
     */
    private _metadata;
    private readonly _onDestroyed;
    private readonly _onWrite;
    private readonly _onMetaData;
    get initialized(): boolean;
    get finished(): boolean;
    get metadata(): StreamMetadata | undefined;
    get rawData(): Uint8Array[];
    get isWaitOnReady(): boolean;
    constructor(Flac: Flac, _options: EncoderOptions);
    private _init;
    /**
     * reset encoder:
     * resets internal state and clears cached input/output data.
     */
    reset(options?: EncoderResetOptions): boolean;
    /** finish encoding: the encoder needs to be reset or destroyed afterwards. */
    encode(): boolean;
    /**
     * encode PCM data as an array of channels to FLAC
     * @param  pcmData the PCM data (array of the channels)
     * @param  numberOfSamples the number of samples (for one channel): if omitted, the number will be calculated using the first channel in <code>pcmData</code>
     * @return <code>true</code> if encoding was successful
     *
     * @throws Error in case non-interleaved encoding data did not match the number of expected channels
     */
    encode(pcmData: Int32Array[], numberOfSamples?: number): boolean;
    /**
     * encode PCM data as an array of channels to FLAC
     * @param  pcmData the PCM data (array of the channels)
     * @param  numberOfSamples the number of samples (for one channel): if omitted, the number will be calculated using the first channel in <code>pcmData</code>
     * @param  isInterleaved <code>false</code>
     * @return <code>true</code> if encoding was successful
     *
     * @throws Error in case non-interleaved encoding data did not match the number of expected channels
     */
    encode(pcmData: Int32Array[], numberOfSamples: number | undefined, isInterleaved: false): boolean;
    /**
     * encode interleaved PCM data to FLAC
     * @param  pcmData the PCM data (interleaved: one sample for each channel)
     * @param  numberOfSamples the number of samples (for one channel): if omitted, the number will be calculated using <code>options.channels</code> on <code>pcmData</code>
     * @return <code>true</code> if encoding was successful
     *
     * @throws Error in case non-interleaved encoding data did not match the number of expected channels
     */
    encode(pcmData: Int32Array, numberOfSamples?: number): boolean;
    /**
     * encode interleaved PCM data to FLAC
     * @param  pcmData the PCM data (interleaved: one sample for each channel)
     * @param  numberOfSamples the number of samples (for one channel): if omitted, the number will be calculated using <code>options.channels</code> on <code>pcmData</code>
     * @param  isInterleaved <code>true</code>
     * @return <code>true</code> if encoding was successful
     *
     * @throws Error in case non-interleaved encoding data did not match the number of expected channels
     */
    encode(pcmData: Int32Array, numberOfSamples: number | undefined, isInterleaved: true): boolean;
    getSamples(): Uint8Array;
    getState(): FLAC__StreamEncoderState | -1;
    destroy(): void;
    protected addData(decData: Uint8Array): void;
    protected clearData(): void;
    private _finish;
    private _handleBeforeReady;
}
