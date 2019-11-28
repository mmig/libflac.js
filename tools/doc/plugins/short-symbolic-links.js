/**
*
* Transforms '{@link #x}' to '{@link longname#x x}'.
*
* Allow using shortened links for references within
* the same context.
*
*
* This looks in @description (and @param's description) and @classdesc tags only.
* In addition, @see tags and @fires (and type of @param) are either processed as
* "single links" (i.e. '#x', '.x', or '~x') or as
* "description text" (i.e. containing {@link #x}).
*
* original idea / code base from: https://gist.github.com/pnstickne/fb90239787bd74ca5753
*/

function expandLinks (text, scope) {

	if(typeof text !== 'string'){
		return text;
	}

	var isModified = false;
	var returnValue = text.replace(/\{\s*@link\s+([#.~])([\w$:]+)\s*\}/g, function (_m, mod, name) {
		isModified = true;
        return "{@link " + scope + mod + name + "|" + name + "}";
    });

	if(isModified){
		return returnValue;
	}
	return;
}

function expandSeeTagPath(text, scope) {

	if(typeof text !== 'string'){
		return text;
	}

	//do not proceed, if there is link-tag:
	if(/\{\s*@link\s+\S+\s*\}/g.test(text)){
		return;
	}

	var isModified = false;

	//expand:
	// #some
	// .some
	// ~some
	var returnValue = text.replace(/(^|\s)([#.~])([\w$:]+)($|\s)/g, function (_m, _s1, mod, name, _s2) {
		isModified = true;
//		//return "plain" expanded path:
//        return s1 + scope + mod + name + s2;
		//"pretty print": return path a link-tag, where the label is set to the original name:
		return "{@link " + scope + mod + name + "|" + name + "}";
    });

	if(isModified){
		return returnValue;
	}
	return;
}

function getScope(doclet){
	if(doclet.memberof){
		return doclet.memberof;
	}
	if(doclet.longname){
		return doclet.longname;
	}
	return '';
}

// (doclet, p, scope) where p is index/name of target in doclet
// (text, scope)
function processDescriptionText(doclet, p, scope){

	var t;
	if(typeof doclet === 'string'){
		t = doclet;
		//shift argument:
		scope = p;
	} else {
		t = doclet[p];
	}

	var isModified = false;
	var modText;
	if (t) {
		modText = expandLinks( t, scope );
		if(modText){
			isModified = true;
			doclet[p] = modText;
		}
	}
	return isModified;
}

function processLineTag(tagName, doclet, scope, preprocFunc){
	//line tag (e.g. @see):
	// * process Array of Strings
	// * process either as comment text (i.e. text with {@link} elments
	// * ... or process see-tag as "single symbolic path" (i.e. no free text, only a symbolic link / path)
	var modText, ts, text;
	var t = doclet[tagName];
	if (t) {

		if(typeof t !== 'string'){
			if(Array.isArray(t)){
				ts = t;
			}
			else {
				ts = [t.toString()];
			}
		}
		else {
			ts = [t];
		}

		if(!ts || ts.length < 1){
			return; /////////// EARLY EXIT ////////////
		}

		doclet[tagName] = ts;

		for(var i=0,size=ts.length; i < size; ++i){
			text = preprocFunc? preprocFunc(ts[i]) : ts[i];
			if( ! processDescriptionText(text, scope)){
				modText = expandSeeTagPath(text, scope);
				if(modText){
					doclet[tagName][i] = modText;
				}
			}
		}
	}
}

function processParamsTag(params, scope){

//	params: Array of
//	  {
//        "type": { "names": [ STRING ] },
//        "description": STRING
//        "name": STRING
//    }

	var param, modText, j, len, types;
	if (params && params.length > 0) {

		for(var i=0,size=params.length; i < size; ++i){

			param = params[i];

			//1. description
			processDescriptionText(param, 'description', scope);

			//2. type
			if(param.type && param.type.names){
				types = param.type.names;
				for(j=0, len = types.length; j < len; ++j){
					modText = expandSeeTagPath(types[j], scope);
					if(modText){
						types[j] = modText;
					}
				}
			}
		}
	}
}

exports.handlers = {};
exports.handlers.newDoclet = function (e) {

    var doclet = e.doclet;
	var scope = getScope(doclet);
	if(!scope){
		return; /////////// EARLY EXIT ////////////////
	}

	processDescriptionText(doclet, 'description', scope);
	processDescriptionText(doclet, 'classdesc', scope);
	processDescriptionText(doclet, 'deprecated', scope);

	//process line-tags with links (e.g. see, fire, ...):
	// * process Array of Strings
	// * process either as comment text (i.e. text with {@link} elements
	// * ... or process line-tag as "single symbolic path" (i.e. no free text, only a symbolic link / path)
	processLineTag('see', doclet, scope);
	processLineTag('fires', doclet, scope, function preprocess(text){
		if(/^event:/.test(text)){
			return '#' + text;
		}
		return text;
	});

	//process params
	processParamsTag(doclet.params, scope);

	//original impl.:
    // ['description', 'classdesc', 'see'].forEach(function (p) {
        // if (doclet[p]) {
            // modText = expandLinks( doclet[p], getScope(doclet) );
			// if(modText){
				// doclet[p] = modText;
			// }
        // }
    // });

};
