
var fs = require('fs');

var typeArrayStr = 'Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array';// | BigInt64Array | BigUint64Array';

var handleEnumAsTypeDef = true;

function getJsonConfig(fileName) {
	return JSON.parse(fs.readFileSync(fileName));
}

function logDefault() {
	console.log.apply(console, arguments);
}

function setLogFunc(logFunc){
	log = logFunc? logFunc : logDefault;
}

var log = logDefault;


function generateDeclarationFromFile(inFileName, outFileName, callback) {
	var jsdocJson = getJsonConfig(inFileName);
	generateDeclaration(jsdocJson, outFileName, callback)
}


function generateDeclaration(jsdocJson, outFileName, callback) {

	var rootDict = getRootElements(jsdocJson);
	addMembers(jsdocJson, rootDict);

	var code = `export as namespace Flac;\r\n`;
	Object.values(rootDict).forEach(function(el){

		// code += `${indentComment(el.comment, '')}\ndeclare class ${el.name.replace(/^Flac$/, 'FlacClass')} {\r\n`;
		if(el.children){
			el.children.forEach(function(ch){
				code += generateCode(ch, 0, 'all');//'members');
			})
		}
		// code += `\r\n}\r\ndeclare namespace ${el.name.replace(/^Flac$/, 'FlacClass')} {\r\n`;
		// if(el.children){
		// 	el.children.forEach(function(ch){
		// 		code += generateCode(ch, 2, 'types');
		// 	})
		// }
		code += `\r\nexport type TypedArray = ${typeArrayStr};`;
		// code += `\r\n}\r\n`;
	});

	log('finished!');

	fs.writeFile(outFileName, code, 'utf8', callback);
}

function getRootElements(jsdocJson){
	var dict = {};
	jsdocJson.forEach(function(el){
		if(el.undocumented){
			return;
		}

		if(el.scope === 'global'){
			dict[el.name] = el;
		}
	});
	return dict;
}

function addMembers(jsdocJson, rootDict){
	jsdocJson.forEach(function(el){
		if(el.undocumented){
			return;
		}

		var parent = rootDict[el.memberof];
		if(parent){
			if(!parent.children){
				parent.children = [el];
			} else if(!parent.children.find(function(other){other.name === el.name})){
				parent.children.push(el)
			} else {
				log('WARN already present '+el.longname, el);
			}
		}
	});
}

function indentComment(comment, indentStr){
	return comment.replace(/(\r?\n)\s*( \*)/gm, '$1'+indentStr+'$2');
}

function descriptionToComment(description, indentStr){
	return '/**\r\n'+indentStr+' * ' + description.replace(/(\r?\n)/gm, '$1'+indentStr+' * ') + '\r\n'+indentStr+' */';
}

function generateCode(el, indent, genType){
	var ist = indentStr(indent);
	var kind = getKind(el);
	var kindStr = genType === 'members'? 'public' : 'export ' + (handleEnumAsTypeDef && kind === 'enum'? 'type' : kind);
	var code = `${ist}${indentComment(el.comment, ist)}\r\n${ist}${kindStr} ${el.name}`;
	if(kind === 'function'){
		if(genType === 'types'){
			return '';
		}
		code += generateFunctionSigCode(el.params, el.returns) + ';';
	} else if(kind === 'interface'){
		if(genType === 'members'){
			return '';
		}
		code += ' {' + generateInterfaceCode(el, indent + 2) + ist + '}';
	} else if(kind === 'enum'){
		if(genType === 'members'){
			return '';
		}
		if(handleEnumAsTypeDef){
			code += generateTypeCode(el, true) + ';';
		} else {
			code += ' {' + generateEnumCode(el, indent + 2) + ist + '}';
		}
	} else if(kind === 'type'){
		if(genType === 'members'){
			return '';
		}
		code += generateTypeCode(el) + ';';
	} else if(kind === 'var'){
		if(genType === 'types'){
			return '';
		}
		code += ': ' + generateFunctionSigCode(el.params, el.returns, true) + ';';
	} else {
		if(genType === 'types'){
			return '';
		}
		code += ` /* ${el.kind} */;`
	}
	code += `\r\n`;
	return code;
}


function getKind(el){
	switch(el.kind){
		case 'function':
			return isFunctionVar(el)? 'var' : 'function';
		case 'interface':
			return isEnum(el)? 'enum' : 'interface';
		case 'event':
			return 'interface';
		case 'typedef':
			return 'type';
		default:
			return 'const';
	}
}

function isEnum(el){
	if(!el.properties){
		return false;
	}
	var p, name, val;
	for(var i=0, size = el.properties.length; i < size; ++i){
		p = el.properties[i];
		name = p.name;
		if(/^(-\s*)?\d+$/.test(name)){

			//-> enum candidate

		} else {
			try{
				val = JSON.parse(p.type.names.join(' | '));
				if(typeof JSON.parse(val) === 'string' && val === name){

					//-> enum candidate

				} else {
					return false;
				}
			} catch(e){
				return false;
			}
		}
	}
	return true;
}

function isFunctionVar(el){
	return el.kind === 'function' && el.defaultvalue;
}

function isFunctionTypeDef(el){
	return el.kind === 'typedef' && toTypeList(el.type).join(' | ') === 'Function';
}

function generateFunctionSigCode(paramList, returns, isType){
	var params = [];
	if(paramList){
		paramList.forEach(function(p){
			params.push(p.name + (p.optional? '?':'') + ': ' + toTypeList(p.type).join(' | '))
		});
	}

	var ret = returns? returns.map(function(r){
		return toTypeList(r.type).join(' | ');
	}).join(' | ') : 'void';

	return '(' + params.join(', ') + ')' + (isType? ' => ' : ': ') + toTypeStr(ret);
}

function generateInterfaceCode(el, indent){

	var istr = indentStr(indent);
	var props = [], comment;
	if(el.properties){
		el.properties.forEach(function(p){
			comment = p.description? descriptionToComment(p.description, istr) + '\r\n' + istr : '';
			props.push(comment + p.name + (p.optional? '?' : '') + ': ' + toTypeList(p.type).join(' | ') + ';');
		});
	}
	return '\r\n' + istr + props.join('\r\n'+istr) + '\r\n';
}

function generateEnumCode(el, indent){

	var istr = indentStr(indent);
	var props = [];
	if(el.properties){
		el.properties.forEach(function(p){
			props.push(toTypeList(p.type).join(' | ') + ' = ' + p.name);
		});
	}
	return '\r\n' + istr + props.join(',\r\n'+istr) + '\r\n';
}

function generateTypeCode(el, usePropName){

	if(el.kind === 'function' || isFunctionTypeDef(el)){
		return ' = ' + generateFunctionSigCode(el.params, el.returns, true);
	}
	return ' = ' + (!el.properties? 'any' : el.properties.map(function(prop){
		if(usePropName){
			return prop.name;
		}
		return toTypeList(prop.type).join(' | ');
	}).join(' | '));
}

function toTypeList(typeField){
	return typeField.names.map(function(t){ return toTypeStr(t)});
}

function toTypeStr(type){
	if(type === 'function'){
		return 'Function';
	}
	if(type === 'Flac'){
		return 'any';
	}
	// if(type === 'TypedArray'){
	// 	return 'FlacClass.TypedArray';
	// }
	return type.replace(/^Flac[#~.](event:)?/, '').replace(/^Array\.</,'Array<');
}

function indentStr(indent){
	if(!indent) return '';
	return new Array(indent).fill(' ').join('');
}


function testRun(){
	var inFileName = '../temp/libflac_jsdoc.json';
	var outFileName = '../temp/test_index.d.ts';
	generateDeclarationFromFile(inFileName, outFileName, function(){
		log('finished!');
	});
}

module.exports = {
	generateDeclaration: generateDeclaration,
	// generateDeclarationFromFile: generateDeclarationFromFile,
	devTest: testRun,
	setLogFunc: setLogFunc
}
