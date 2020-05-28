// libflac.js - port of libflac to JavaScript using emscripten


(function (root, factory) {

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['module', 'require'], factory.bind(null, root));
	} else if (typeof module === 'object' && module.exports) {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.

		// use process.env (if available) for reading Flac environment settings:
		var env = typeof process !== 'undefined' && process && process.env? process.env : root;
		factory(env, module, module.require);
	} else {
		// Browser globals
		root.Flac = factory(root);
	}

}(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : this, function (global, expLib, require) {
'use strict';

var Module = Module || {};
var _flac_ready = false;
//in case resources are loaded asynchronously (e.g. *.mem file for minified version): setup "ready" handling
Module["onRuntimeInitialized"] = function(){
	_flac_ready = true;
	if(!_exported){
		//if _exported is not yet set (may happen, in case initialization was strictly synchronously),
		// do "pause" until sync initialization has run through
		setTimeout(function(){do_fire_event('ready', [{type: 'ready', target: _exported}], true);}, 0);
	} else {
		do_fire_event('ready', [{type: 'ready', target: _exported}], true);
	}
};

if(global && global.FLAC_SCRIPT_LOCATION){

	Module["locateFile"] = function(fileName){
		var path = global.FLAC_SCRIPT_LOCATION || '';
		if(path[fileName]){
			return path[fileName];
		}
		path += path && !/\/$/.test(path)? '/' : '';
		return path + fileName;
	};

	//NOTE will be overwritten if emscripten has env specific implementation for this
	var readBinary = function(filePath){

		//for Node: use default implementation (copied from generated code):
		if(ENVIRONMENT_IS_NODE){
			var ret = read_(filePath, true);
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

//fallback for fetch && support file://-protocol: try read as binary if fetch fails
if(global && typeof global.fetch === 'function'){
	var _fetch = global.fetch;
	global.fetch = function(url){
		return _fetch.apply(null, arguments).catch(function(err){
			try{
				var result = readBinary(url);
				if(result && result.catch){
					result.catch(function(_err){throw err});
				}
				return result;
			} catch(_err){
				throw err;
			}
		});
	};
}
