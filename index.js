
var path = require('path');

// confiuration for loading libflac.js:

//optimization variants:
var optVariant = {
	default: '',
	release: '',
	dev: '.dev',
	min: '.min'
};

//technology variants:
var tecVariant = {
	default: '',
	asmjs: '',
	wasm: '.wasm'
};

var baseDir = path.resolve(__dirname, 'dist');
var baseName = 'libflac';
var ext = '.js';

// export factory method:
module.exports = function(impl){

	var optv, optStr;
	if(/\bdev\b/.test(impl)){
		optv = optVariant['dev'];
		optStr = 'dev';
	} else if(/\bmin\b/.test(impl)){
		optv = optVariant['min'];
		optStr = 'min';
	} else {
		optv = optVariant['default'];
		optStr = 'release';
	}

	var tecv, tecStr;
	if(/\bwasm\b/.test(impl)){
		tecv = tecVariant['wasm'];
		tecStr = 'wasm';
	} else {
		tecv = tecVariant['default'];
		tecStr = 'asmjs';
	}

	var libPath = baseDir + path.sep;
	// set library directory
	process.env.FLAC_SCRIPT_LOCATION = libPath;
	// load library variant
	var libInstance = require(libPath + baseName + optv + tecv + ext);
	libInstance.variant = optStr + '.' + tecStr;
	return libInstance;
}
