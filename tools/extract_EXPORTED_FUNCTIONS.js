

var fs = require('fs'),
	path = require('path');

var str = fs.readFileSync(path.join('..', 'libflac_post.js'), 'utf8');

var re = /Module.c((wrap)|(call))\(\s*?['"](.*?)['"]/igm

var res;
var funcs = new Set();
while(res = re.exec(str)){
	funcs.add(res[4]);
}

var sb = ["-s EXPORTED_FUNCTIONS='["];
for(var f of funcs){
	sb.push('"_', f, '"', ',');
}

if(sb.length > 1){
	sb.splice(sb.length - 1, 1);
}
sb.push("]'");

console.log(sb.join(''));
