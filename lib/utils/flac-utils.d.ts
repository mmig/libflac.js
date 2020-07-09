import { StreamMetadata } from '../../index.d';
export declare function exportFlacData(recBuffers: Uint8Array[], metaData: StreamMetadata, isOgg: boolean): Promise<Uint8Array>;
export declare function addFLACMetaData(chunks: Uint8Array[], metadata: StreamMetadata, isOgg: boolean): void;
export declare function writeMd5(view: DataView, offset: number, str: string): void;
/**
 *  creates blob element from libflac-encoder output
 */
export declare function exportFlacFile(recBuffers: Uint8Array[], metaData: StreamMetadata, isOgg: boolean): Blob;
