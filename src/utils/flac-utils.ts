
import { StreamMetadata } from '../../index.d';
import { getLength , mergeBuffers } from './data-utils';

export function exportFlacData(recBuffers: Uint8Array[], metaData: StreamMetadata, isOgg: boolean) : Promise<Uint8Array> {
	var recLength = getLength(recBuffers);
	if(metaData){
		addFLACMetaData(recBuffers, metaData, isOgg);
	}
	//convert buffers into one single buffer
	return Promise.resolve(mergeBuffers(recBuffers, recLength));
}


export function addFLACMetaData(chunks: Uint8Array[], metadata: StreamMetadata, isOgg: boolean): void {

	var offset = 4;
	var dataIndex = 0;
	var data = chunks[0];//1st data chunk should contain FLAC identifier "fLaC" or OGG identifier "OggS"
	if(isOgg){
		offset = 13;
		dataIndex = 1;
		if(data.length < 4 || String.fromCharCode.apply(null, data.subarray(0, 4) as unknown as number[]) != "OggS"){
			console.error('Unknown data format: cannot add additional FLAC meta data to OGG header');
			return;
		}
	}

	data = chunks[dataIndex];//data chunk should contain FLAC identifier "fLaC"
	if(data.length < 4 || String.fromCharCode.apply(null, data.subarray(offset-4, offset) as unknown as number[]) != "fLaC"){
		console.error('Unknown data format: cannot add additional FLAC meta data to header');
		return;
	}

	if(isOgg){
		console.info('OGG Container: cannot add additional FLAC meta data to header due to OGG format\'s header checksum!');
		return;
	}

	//first chunk only contains the flac identifier string?
	if(data.length == 4){
		data = chunks[dataIndex + 1];//get 2nd data chunk which should contain STREAMINFO meta-data block (and probably more)
		offset = 0;
	}

	var view = new DataView(data.buffer);

	// console.log('addFLACMetaData: '+(isOgg? 'OGG' : 'FLAC')+' (offset: '+offset+') -> ', metadata, view)

	//NOTE by default, the encoder writes a 2nd meta-data block (type VORBIS_COMMENT) with encoder/version info -> do not set "is last" to TRUE for first one
//	// write "is last meta data block" & type STREAMINFO type (0) as little endian combined uint1 & uint7 -> uint8:
//	var isLast = 1;//1 bit
//	var streamInfoType = 0;//7 bit
//	view.setUint8(0 + offset, isLast << 7 | streamInfoType, true);//8 bit

	// block-header: STREAMINFO type, block length -> already set

	// block-content: min_blocksize, max_blocksize -> already set

	// write min_framesize as little endian uint24:
	view.setUint8( 8 + offset, metadata.min_framesize >> 16);//24 bit
	view.setUint8( 9 + offset, metadata.min_framesize >> 8);//24 bit
	view.setUint8(10 + offset, metadata.min_framesize);//24 bit

	// write max_framesize as little endian uint24:
	view.setUint8(11 + offset, metadata.max_framesize >> 16);//24 bit
	view.setUint8(12 + offset, metadata.max_framesize >> 8);//24 bit
	view.setUint8(13 + offset, metadata.max_framesize);//24 bit

	// block-content: sampleRate, channels, bitsPerSample -> already set

	// write total_samples as little endian uint36:
	//TODO set last 4 bits to half of the value in index 17
	view.setUint8(18 + offset, metadata.total_samples >> 24);//36 bit
	view.setUint8(19 + offset, metadata.total_samples >> 16);//36 bit
	view.setUint8(20 + offset, metadata.total_samples >> 8);//36 bit
	view.setUint8(21 + offset, metadata.total_samples);//36 bit

	writeMd5(view, 22 + offset, metadata.md5sum);//16 * 8 bit
}

export function writeMd5(view: DataView, offset: number, str: string): void {
	var index;
	for(var i = 0; i < str.length/2; ++i) {
		index =  i * 2;
		view.setUint8(i + offset, parseInt(str.substring(index, index + 2), 16));
	}
}


/**
 *  creates blob element from libflac-encoder output
 */
export function exportFlacFile(recBuffers: Uint8Array[], metaData: StreamMetadata, isOgg: boolean): Blob {
	const recLength = getLength(recBuffers);
	if(metaData){
		addFLACMetaData(recBuffers, metaData, isOgg);
	}
	//convert buffers into one single buffer
	const samples = mergeBuffers(recBuffers, recLength);
	return new Blob([samples], {type: isOgg? 'audio/ogg' : 'audio/flac'});
}
