
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

var baseDir = './dist';
var baseName = 'libflac4-1.3.2';
var ext = '.js';

// export factory method:
module.exports = function(impl){

  var libPath;
  var optv;
  if(/\bdev\b/.test(impl)){
    optv = optVariant['dev'];
    libPath = '/dev';
  } else if(/\bmin\b/.test(impl)){
    optv = optVariant['min'];
    libPath = '/min';
  } else {
    optv = optVariant['default'];
    libPath = '';
  }

  var tecv;
  if(/\bwasm\b/.test(impl)){
    tecv = tecVariant['wasm'];
  } else {
    tecv = tecVariant['default'];
  }

  libPath = baseDir + libPath + '/';
  
  // set library directory
  process.env.FLAC_SCRIPT_LOCATION = libPath;
  // load library variant
  return require(libPath + baseName + optv + tecv + ext);
}
