/**
 *  checks if the given ui8_data (ui8array) is of a wav-file
 */
export declare function wav_file_processing_check_wav_format(ui8_data: Uint8Array): boolean;
/**
 *  checks if the given ui8_data (ui8array) is of a flac-file
 */
export declare function flac_file_processing_check_flac_format(ui8_data: Uint8Array, isOgg?: boolean): boolean;
export declare function to_string(ui8_data: Uint8Array, start: number, end: number): string;
export declare type WavHeader = {
    sample_rate: number;
    channels: number;
    bps: number;
    total_samples: number;
    block_align: number;
};
/**
 *  reads the paramaters of a wav-file - stored in a ui8array
 */
export declare function wav_file_processing_read_parameters(ui8_data: Uint8Array): WavHeader;
