
export function getLength(recBuffers: Uint8Array[]) : number {
	var recLength = 0;
	for(var i=recBuffers.length - 1; i >= 0; --i){
		recLength += recBuffers[i].byteLength;
	}
	return recLength;
}

export function mergeBuffers(channelBuffer: Uint8Array[], recordingLength: number): Uint8Array {
	var result = new Uint8Array(recordingLength);
	var offset = 0;
	var lng = channelBuffer.length;
	for (var i = 0; i < lng; i++){
		var buffer = channelBuffer[i];
		result.set(buffer, offset);
		offset += buffer.length;
	}
	return result;
}

export function getLengthFor(recBuffers: Uint8Array[][], index: number, sampleBytes: number, bytePadding: number){

	var recLength = 0, blen;
	var decrFac = bytePadding > 0? bytePadding / sampleBytes : 0;//<- factor do decrease size in case of padding bytes
	for(var i=recBuffers.length - 1; i >= 0; --i){
		blen = recBuffers[i][index].byteLength;
		if(bytePadding > 0){
			recLength += blen - (decrFac * blen);
		} else {
			recLength += blen;
		}
	}
	return recLength;
}
