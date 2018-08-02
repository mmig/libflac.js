
// confiuration for loading libflac.js:

// set library directory
// (not really necessary a.t.m. for the default non-wasm library version)
process.env.FLAC_SCRIPT_LOCATION = './libs/';
// avoid export to global namespace, i.e. export as module only:
process.env.FLAC_UMD_MODE = true;

// export standard (asm.js) variant of the library:
module.exports = require('./dist/libflac4-1.3.2.js');
