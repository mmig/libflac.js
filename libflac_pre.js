// libflac.js - port of libflac to JavaScript using emscripten


(function (root, factory) {

	var lib, env;
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(function () {
				var _lib = factory(root);
				lib = _lib;
				return _lib;
		});
	} else if (typeof module === 'object' && module.exports) {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.

		// use process.env (if available) for reading Flac environment settings:
		env = typeof process !== 'undefined' && process && process.env? process.env : root;
		lib = factory(env);
		module.exports = lib;
	} else {
		// Browser globals
		lib = factory(root);
		root.Flac = lib;
	}

	if(env? !env.FLAC_UMD_MODE : !root.FLAC_UMD_MODE){
		//"classic mode": export to global variable Flac regardless of environment.

		// if in Node environment, use Node's global (if available) as global/root namespace:
		root = env && env !== root && typeof global !== 'undefined' && global? global : root;
		root.Flac = lib;
	}

}(typeof self !== 'undefined' ? self : this, function (global) {
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

		//for Node: use default implementation (copied from generated code):
		if(ENVIRONMENT_IS_NODE){
			var ret = Module['read'](filePath, true);
			if (!ret.buffer) {
				ret = new Uint8Array(ret);
			}
			assert(ret.buffer);
			return ret;
		}

		//otherwise: try "fallback" to AJAX
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
