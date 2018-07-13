// libflac.js - port of libflac to JavaScript using emscripten

var Flac = (function(global) {
'use strict';

var Module = Module || {};
var _flac_ready = false;
//in case resources are loaded asynchronously (e.g. *.mem file for minified version): setup "ready" handling
Module["onRuntimeInitialized"] = function(){
	_flac_ready = true;
	if(!_exported){
		//if _exported is not yet set, "pause" until initialization has run through
		setTimeout(function(){if(_exported.onready){_exported.onready();}}, 0);
	} else {
		if(_exported.onready){_exported.onready();}
	}
};

if(global && global.FLAC_SCRIPT_LOCATION){

	Module["memoryInitializerPrefixURL"] = global.FLAC_SCRIPT_LOCATION;

	Module["locateFile"] = function(fileName){
		var path = global.FLAC_SCRIPT_LOCATION || '';
		path += path && !/\/$/.test(path)? '/' : '';
		return path + fileName;
	};

	Module["readBinary"] = function(filePath){
		return new Promise(function(resolve, reject){
			var xhr = new XMLHttpRequest();
			xhr.responseType = "arraybuffer";
			xhr.addEventListener("load", function(evt){
				resolve(xhr.response);
			});
			xhr.addEventListener("error", function(err){
				reject(err);
			});
			xhr.open("GET", filePath);
			xhr.send();
		});
	};
}
