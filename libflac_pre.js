// libflac.js - port of libflac to JavaScript using emscripten

var window = window || this;
var Flac = (function(global) {

var Module = Module || {};
var _flac_ready = false;
//in case resources are loaded asynchronously (e.g. *.mem file for minified version): setup "ready" handling
Module["_main"] = function(){
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
}
