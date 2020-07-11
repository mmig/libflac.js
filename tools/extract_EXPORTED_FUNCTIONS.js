
/**
 * HELPER script for extracting exported C functions
 * (to be used for emscripten compiler setting EXPORTED_FUNCTIONS)
 */

var fs = require('fs'),
	path = require('path');

var str = fs.readFileSync(path.join(__dirname, '..', 'libflac_post.js'), 'utf8');

var re = /Module.c((wrap)|(call))\(\s*?['"](.*?)['"]/igm

var res;
var funcs = new Set();
while(res = re.exec(str)){
	funcs.add(res[4]);
}

var list = Array.from(funcs).sort(function(a, b){
	return a.localeCompare(b);
});

var len = list.length;
var sb = list.map(function(f, i){
	return '"_' + f + '"' + (i === len -1? '' : ',');
});
sb.unshift("-s EXPORTED_FUNCTIONS='[");
sb.push("]'");

console.log(sb.join(''));
