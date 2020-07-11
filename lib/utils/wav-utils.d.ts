/**
 *  converts the PCM data of the wav file (each sample stored as 8 or 16 or 24 bit value) into
 *  a format expected by the libflac-encoder method (each sample stored as 32 bit value in a 32-bit array)
 */
export declare function wav_file_processing_convert_to32bitdata(arraybuffer: ArrayBuffer, bps: number): Int32Array | undefined;
export declare function interleave(recBuffers: Uint8Array[][], channels: number, bitsPerSample: number): Uint8Array;
/**
 * write PCM data to a WAV file, incl. header
 *
 * @param samples the PCM audio data
 * @param sampleRate the sample rate for the audio data
 * @param channels the number of channels that the audio data contains
 * @param bitsPerSample the bit-per-sample
 *
 * @returns the WAV data incl. header
 */
export declare function encodeWAV(samples: Uint8Array, sampleRate: number, channels: number, bitsPerSample: number): DataView;
export declare function writeString(view: DataView, offset: number, str: string): void;
export declare function writeData(view: DataView, offset: number, input: Uint8Array): void;
/**
 * creates blob element PCM audio data incl. WAV header
 *
 * @param recBuffers
 * 			the array of buffered audio data, where each entry contains an array for the channels, i.e.
 * 			recBuffers[0]: [channel_1_data, channel_2_data, ..., channel_n_data]
 * 			recBuffers[1]: [channel_1_data, channel_2_data, ..., channel_n_data]
 * 			...
 * 			recBuffers[length-1]: [channel_1_data, channel_2_data, ..., channel_n_data]
 *
 * @returns blob with MIME type audio/wav
 */
export declare function exportWavFile(recBuffers: Uint8Array[][], sampleRate: number, channels: number, bitsPerSample: number): Blob;
