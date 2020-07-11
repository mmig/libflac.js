
const fs = require('fs-extra');
const path = require('path');

const genWav = require('./gen-wav');

const testFilesTemplateDir = __dirname + '/data/wav_src_files';
const testFilesDir = __dirname + '/temp/wav_test_files';

module.exports = {
	generateWavTestFiles: function(cb){

		const inDir = testFilesTemplateDir;
		if(!fs.existsSync(inDir)){
			const err = new Error('Input directory does not exist: '+path.resolve(inDir));
			return cb? cb(err) : console.error(err);
		}
		const outDir = testFilesDir;
		fs.ensureDirSync(outDir);

		// const bits = ['4', '8', '16', '24', '32', '64'];
		const bits = ['8', '16', '24'];
		const rates = [8000, 16000, 20000, 22500, 32000, 44100, 48000, 96000];

		genWav.convertDir(inDir, outDir, bits, rates, function(err){
			if(err){
				console.error('ERROR: ', err);
			} else {
				console.log('finished generating test files in ', outDir);
			}
			cb && cb(err);
		});
	},
	compareTest: function(){
		const f = path.resolve(testFilesTemplateDir, '5sec.wav');
		const f2 = path.resolve(testFilesDir, '5sec_16-bit_22500Hz.wav');

		require('./file-utils').compareFiles(f, f2, function(err, result){
			console.log('comparision result: ', err, result)
		});
	}
}

if (typeof module !== 'undefined' && require.main === module) {
  // console.log(process.argv.slice(2));
  // module.exports.compareTest()
  module.exports.generateWavTestFiles()
}
