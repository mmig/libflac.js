
var path = require('path');

// confiuration for loading libflac.js:

// avoid export to global namespace, i.e. export as module only:
process.env.FLAC_UMD_MODE = true;

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

	var optv;
	if(/\bdev\b/.test(impl)){
		optv = optVariant['dev'];
	} else if(/\bmin\b/.test(impl)){
		optv = optVariant['min'];
	} else {
		optv = optVariant['default'];
	}

	var tecv;
	if(/\bwasm\b/.test(impl)){
		tecv = tecVariant['wasm'];
	} else {
		tecv = tecVariant['default'];
	}

	var libPath = baseDir + path.sep;
	// set library directory
	process.env.FLAC_SCRIPT_LOCATION = libPath;
	// load library variant
	return require(libPath + baseName + optv + tecv + ext);
}
