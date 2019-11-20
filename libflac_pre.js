// libflac.js - port of libflac to JavaScript using emscripten


(function (root, factory) {

	var lib, env;
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['require'], function (req) {
			lib = factory(root, req);
			return lib;
		});
	} else if (typeof module === 'object' && module.exports) {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.

		// use process.env (if available) for reading Flac environment settings:
		env = typeof process !== 'undefined' && process && process.env? process.env : root;
		lib = factory(env, module.require);
		module.exports = lib;
	} else {
		// Browser globals
		lib = factory(root);
		root.Flac = lib;
	}

	//non-UMD mode: "classic mode" exports library to global variable Flac regardless of environment.
	// -> for backwards compatibility: by default, always export library to global variable Flac
	//                                 except in case UMD mode is explicitly activated.
	var umdMode = env? env.FLAC_UMD_MODE : root.FLAC_UMD_MODE;
	if(/false/.test(umdMode)){//<- normalize "true" | "false" | true | false -> BOOLEAN

		// if in Node environment, use Node's global (if available) as global/root namespace:
		root = env && env !== root && typeof global !== 'undefined' && global? global : root;
		root.Flac = lib;
	}

}(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : this, function (global, require) {
'use strict';

var Module = Module || {};
var _flac_ready = false;
//in case resources are loaded asynchronously (e.g. *.mem file for minified version): setup "ready" handling
Module["onRuntimeInitialized"] = function(){
	_flac_ready = true;
	if(!_exported){
		//if _exported is not yet set, "pause" until sync initialization has run through
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
