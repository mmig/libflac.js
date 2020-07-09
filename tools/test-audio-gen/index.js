
const fs = require('fs');
const path = require('path');
const WaveFile = require('wavefile').WaveFile;

// bitDepths -> allowed sample rate
// (if no entry => no restrictions)
const formatRestrictions = {
	4: [8000]
}

function isAllowed(bitDepth, sampleRate){
	if(formatRestrictions[bitDepth]){
		var l = formatRestrictions[bitDepth];
		for(var i = l.length - 1; i >= 0; --i){
			if(l[i] === sampleRate){
				return true; //////////// EARLY EXIT ///////////////////
			}
		}
		return false; ////////////////// EARLY EXIT ///////////////////
	}
	return true;
}

function convert(from, to, newBitDepth, newSampleRate, cb){

	fs.readFile(from, function(err, data){

		if(err){
			return cb? cb(err) : console.error(err);
		}

		// Load a wav file with 32-bit audio
		let wav = new WaveFile(data);


		// Change the sample rate to xx Hz using the default configuration
		if(typeof newSampleRate === 'number' && newSampleRate > 0){
			wav.toSampleRate(newSampleRate);
		}

		// Change the bit depth to xx-bit
		if(newBitDepth){
			if(newBitDepth === '4'){
				wav.toSampleRate(8000);
				wav.toBitDepth('16');
				const wav2 = new WaveFile();
				wav2.fromScratch(1, 8000, '16', wav.getSamples()[0]);
				wav2.toIMAADPCM();
				wav = wav2;
			} else {
				wav.toBitDepth(newBitDepth+'');
			}
		}

		// Write the new 24-bit file
		fs.writeFile(to, wav.toBuffer(), function(err){
			cb? cb(err) : (err? console.error(err) : console.log('  wrote file ', to));
		});
	});

}

function convertDir(inDir, outDir, bitDepths, sampleRates, cb){
	fs.readdir(inDir, function(err, files){
		if(err){
			return cb? cb(err) : console.error(err);
		}

		files.forEach(function(f){
			if(!/\.wav$/i.test(f)){
				return;
			}

			const file = path.resolve(inDir, f);
			const fname = path.basename(f, '.wav');
			var outFile, bps, sr;

			for(var i=0, s1 = bitDepths.length; i < s1; ++i){
				bps = bitDepths[i];
				for(var j=0, s2 = sampleRates.length; j < s2; ++j){
					sr = sampleRates[j];
					if(!isAllowed(bps, sr)){
						continue;
					}
					outFile = path.resolve(outDir, fname + '_' + bps +  '-bit_' + sr + 'Hz.wav');
					console.log('  converting ', fname, ' -> ', outFile)
					convert(file, outFile, bps, sr, function(err){
						if(err){
							console.error('ERROR: ', err);
						} else {
							console.log('  wrote file ', outFile)
						}
					})
				}
			}
		});
		console.log('finished processing ', inDir);
	})
}

const bits = ['4', '8', '16', '24', '32', '64'];
const rates = [8000, 16000, 20000, 32000, 44100, 48000, 96000];
const inDir = '../../test_data/wav_src_files';
const outDir = '../../test_data/wav_test_files';
convertDir(inDir, outDir, bits, rates);
