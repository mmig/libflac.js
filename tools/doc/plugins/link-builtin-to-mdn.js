
/**
 * jsdoc plugin that registers MDN (Mozilla Developer) links
 * for built-in JavaScript types
 */

var helper = require('jsdoc/util/templateHelper');

var links = {
  // Global_Objects references:
  Boolean:  '<g>/Boolean',
  Function: '<g>/Function',
  Number:   '<g>/Number',
  String:   '<g>/String',
  Array:    '<g>/Array',
  Date:     '<g>/Date',
  Error:    '<g>/Error',
  Object:   '<g>/Object',
  Promise:  '<g>/Promise',
  TypedArray: '<g>/TypedArray',
  Int8Array: '<g>/Int8Array',
  Uint8Array: '<g>/Uint8Array',
  Uint8ClampedArray: '<g>/Uint8ClampedArray',
  Int16Array: '<g>/Int16Array',
  Uint16Array: '<g>/Uint16Array',
  Int32Array: '<g>/Int32Array',
  Uint32Array: '<g>/Uint32Array',
  Float32Array: '<g>/Float32Array',
  Float64Array: '<g>/Float64Array',
  BigInt64Array: '<g>/BigInt64Array',
  BigUint64Array: '<g>/BigUint64Array',
  // API references:
  ProgressEvent:  '<a>/ProgressEvent',
  XMLHttpRequest: '<a>/XMLHttpRequest'
}

var baseUrls = {
  global: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects',
  api: 'https://developer.mozilla.org/en-US/docs/Web/API'
}

exports.handlers = {
  parseBegin: function(_sourcefiles){

    Object.keys(links).forEach(symbol => {
      var link = links[symbol];
      var url;
      // switch according to x in link-string "<x>..." (i.e. at index 1)
      switch(link[1]){
        case 'a':
          url = baseUrls.api;
          break;
        case 'g':
          url = baseUrls.global;
          break;
        default:
          //not supported
          return;//////////////// EARLY EXIT ////////////
      }

      url += link.substring(3);// <- use string without prefix "<.>" (i.e. starting from index 3)
      helper.registerLink(symbol, url);
    });
  }
}
