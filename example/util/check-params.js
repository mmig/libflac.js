'use strict'


var getParam = function(name) {

  var str = window.document.location.search;

  var match = /\?(.+)$/.exec(str);
  if(match){
    var re = new RegExp(name + '=(.*?)(&|$)', 'm');
    match = re.exec(match[1]);
    return match && match[1] || '';
  }
  return '';
}

// get search-param "lib", (if set, a slash is appendend, if not already present)
var getLibVariantPathParam = function() {

  var variant = getParam('lib') || '';//use "", i.e. standard release as default variant

  if(variant && !/\/$/.test(variant)){//append slash if it does not already end with a slash
    variant += '/';
  }

  return variant;
}


var getDisableWebAssembly = function(){

  var wasmDisable = getParam('wasm');

  if(wasmDisable){
    wasmDisable = /false/i.test(wasmDisable);
  }

  return !!wasmDisable;
}
