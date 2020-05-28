
import * as LibFlac from './dist/index.d';

export = libFactory;

declare function libFactory(libVariant?: string): libFactory.Flac;

declare namespace libFactory {
	export type Flac = typeof LibFlac;
}
