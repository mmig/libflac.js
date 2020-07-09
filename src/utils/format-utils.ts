


/**
 *  checks if the given ui8_data (ui8array) is of a wav-file
 */
export function wav_file_processing_check_wav_format(ui8_data: Uint8Array): boolean {
	// check: is file a compatible wav-file?
	if ((ui8_data.length < 44) ||
		(to_string(ui8_data,  0,  4) != "RIFF") ||
		(to_string(ui8_data,  8, 16) != "WAVEfmt ") ||
		(to_string(ui8_data, 36, 40) != "data"))
	{
		console.log("ERROR: wrong format for wav-file.");
		return false;
	}
	return true;
}

/**
 *  checks if the given ui8_data (ui8array) is of a flac-file
 */
export function flac_file_processing_check_flac_format(ui8_data: Uint8Array, isOgg?: boolean): boolean {

	var offset = 4;//-> offset for end of FLAC identifier "fLaC"

	// check: is file really an OGG container file?
	if(isOgg){
		offset = 41;
		if(ui8_data.length < 4 || to_string(ui8_data, 0, 4) != "OggS"){
			console.error('ERROR: wrong format for OGG-file.');
			return false;
		}
	}

	// check: is file a compatible flac-file?
	if ((ui8_data.length < 38 + offset) ||
		(to_string(ui8_data, offset-4, offset) != "fLaC")
	){
		console.error("ERROR: wrong format for flac-file.");
		return false;
	}

	var view = new DataView(ui8_data.buffer);
	//check last 7 bits of 4th byte for meta-data BLOCK type: must be STREAMINFO (0)
	if ((view.getUint8(offset) & 127 /* 0x7F */) != 0){
		console.error("ERROR: wrong format for flac-file.");
		return false;
	}

	return true;
}

export function to_string(ui8_data: Uint8Array, start: number, end: number): string {
	return String.fromCharCode.apply(null, ui8_data.subarray(start, end) as unknown as number[]);
}

export type WavHeader = {
	sample_rate: number,
	channels: number,
	bps: number,
	total_samples: number,
	block_align: number
};

/**
 *  reads the paramaters of a wav-file - stored in a ui8array
 */
export function wav_file_processing_read_parameters(ui8_data: Uint8Array): WavHeader {
	var sample_rate=0,
		channels=0,
		bps=0,
		total_samples=0,
		block_align;

	// get WAV/PCM parameters from data / file
	sample_rate = (((((ui8_data[27] << 8) | ui8_data[26]) << 8) | ui8_data[25]) << 8) | ui8_data[24];
	channels = ui8_data[22];
	bps = ui8_data[34];
	block_align = ui8_data[32];
	total_samples = ((((((ui8_data[43] << 8) | ui8_data[42]) << 8) | ui8_data[41]) << 8) | ui8_data[40]) / block_align;

	return {
		sample_rate: sample_rate,
		channels: channels,
		bps: bps,
		total_samples: total_samples,
		block_align: block_align
	}
}
