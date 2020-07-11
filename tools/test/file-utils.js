
const fs = require('fs-extra');
const path = require('path');

function processDir(inDir, onFile, cb){
	fs.readdir(inDir, function(err, files){
		if(err){
			return cb? cb(err) : console.error(err);
		}

		files.forEach(function(f){
			const absPath = path.resolve(inDir, f);
			if(!isDirectory(absPath)){
				onFile(f, absPath);
			}
		});
	});
}


function isDirectory(path){
	return fs.lstatSync(path).isDirectory();
}

function compareFiles(file1, file2, cb, offset1, offset2){
	Promise.all([fs.readFile(file1), fs.readFile(file2)]).then(function(dataList){
		cb(null, compareBuffers(dataList[0], dataList[1], offset1, offset2))
	}).catch(cb);
}

function compareBuffers(buff1, buff2, offset1, offset2){
	offset1 = offset1 || 0;
	offset2 = offset2 || 0;
	const len = buff1.length;
	if(len - offset1 !== buff2.length - offset2){
		return false;
	}
	for(var i=len-1; i >= 0; --i){
		if(buff1[i+offset1] !== buff2[i+offset2]){
			return false;
		}
	}
	return true;
}

module.exports = {
	processDir: processDir,
	isDirectory: isDirectory,
	compareFiles: compareFiles,
	compareBuffers: compareBuffers
}
