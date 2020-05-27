

/**
 * process @copydoc tag, that is, resolve the doclet.copydoc property
 *
 * doclet.copydoc = [{from: REFERENCE}, {from: REFERENCE}, ...];
 *
 * Resolving will result in copying all properties from the specified source ("from") to the
 * referencing doclet, that are not already present (i.e. no overwriting).
 *
 *
 * adapted from jsdoc3 sources (Apache License 2.0), specifically from jsdoc/borrow, jsdoc/util/doop
*/

var doop = require('jsdoc/util/doop');
var logger = require('jsdoc/util/logger');

var hasOwnProp = Object.prototype.hasOwnProperty;

var TAG_NAME = 'copydoc';

var singleValueTag = new Set(['returns']);

function getScope(doclet){
	if(doclet.memberof){
		return doclet.memberof;
	}
	if(doclet.longname){
		return doclet.longname;
	}
	return '';
}

/**
 * expand short-references (i.e beginning with # . or ~) using the current scope/context
 *
 * @param text
 *			reference to expand
 * @param scope
 *			the current scope
 * @returns
 */
function expandLink(text, scope) {

	//expand:
	// #some
	// .some
	// ~some
	var returnValue = text.replace(/(^|\s)([#.~])([\w$:]+)($|\s)/g, function (_m, s1, mod, name, s2) {
		//return "plain" expanded path:
		return s1 + scope + mod + name + s2;
	});

	return returnValue;
}

//TODO: add the index at parse time, so we don't have to iterate over all the doclets again
var indexAll = function(doclets) {

	var docrefs = [];
	var doclet;
	var documented = {};
	var longname = {};

	doclets.index = doclets.index || {};

	var isProcDoc = !doclets.index.documented;
	var isProcName = !doclets.index.longname;

	for (var i = 0, l = doclets.length; i < l; i++) {

		doclet = doclets[i];

		if(isProcName){
			// track all doclets by longname
			if ( !hasOwnProp.call(longname, doclet.longname) ) {
				longname[doclet.longname] = [];
			}
			longname[doclet.longname].push(doclet);
		}

		if(isProcDoc){
			// track longnames of documented symbols
			if (!doclet.undocumented) {
				if ( !hasOwnProp.call(documented, doclet.longname) ) {
					documented[doclet.longname] = [];
				}
				documented[doclet.longname].push(doclet);
			}
		}

		// track doclets with a `docrefs` property
		if ( hasOwnProp.call(doclet, TAG_NAME) ) {
			docrefs.push(doclet);
		}
	}

	if(isProcDoc){
		doclets.index.documented = documented;
	}
	if(isProcName){
		doclets.index.longname = longname;
	}
	doclets.index[TAG_NAME] = docrefs;
};

function copyReferencedDoclets(doclet, doclets) {

	var scope = getScope(doclet);

	doclet[TAG_NAME].forEach(function(copyReference) {

		var refLink = expandLink(copyReference.from, scope);

		var referencedDoclet = doclets.index.longname[refLink];

		if (referencedDoclet) {
			doop(referencedDoclet).forEach(function(clone) {

				//copy everything that is not already defined from the cloned
				copy(clone, doclet);
			});
		}

	});
}

function copy(source, target) {

	// var clone;
	// var descriptor;
	var props;
	var prop;
	var i;
	var l;

	if (source instanceof Object) {

		if (Array.isArray(source)) {

			if(!Array.isArray(target)){
				logger.error('Cannot copy doclets due to incompatible data: source is array, but target is not.');
				return;
			}

			var si, ti;
			for (i = 0, l = source.length; i < l; i++) {
				ti = entryIndex(target,source[i]);
				if(ti !== -1){
					// if exists: insert into (i.e. overwrite in) cloned source array
					si = entryIndex(source,source[i]);
					source[si] = target[ti];
					target.splice(ti, 1);//<- remove copied (now duplicate) entry from target array
				}
			}
			//actually append the source-array to the target-array:
			for (i = 0, l = source.length; i < l; i++) {
				target.push(source[i]);
			}
		}
		else {

			props = Object.keys(source);
			for (i = 0, l = props.length; i < l; i++) {
				prop = props[i];

				if(target[prop]){

					if (target[prop] instanceof Object && !singleValueTag.has(prop)){
						copy(source[prop], target[prop]);
					}

				} else {
					target[prop] = source[prop];
				}

			}
		}

	}
}

function entryIndex(arr, e){
	var i, l, it, hasName = e && typeof e.name !== 'undefined';
	for (i = 0, l = arr.length; i < l; i++) {
		it = arr[i];
		//NOTE do use fuzzy equals!
		if(hasName && it && it.name == e.name){
			//if existing, decide equality by name field...
			return i;
		} else if(it == e){
			//...otherwise by simple equality
			return i;
		}
	}
	return -1;
}

// requires docs to have been indexed: docs.index must be defined here
var resolveRefDoc = function(doclets) {
	var doclet;

	if (!doclets.index) {
		logger.error('Unable to resolve copydoc symbols, because the docs have not been indexed.');
		return;
	}

	for (var i = 0, l = doclets.index[TAG_NAME].length; i < l; i++) {
		doclet = doclets.index[TAG_NAME][i];
		copyReferencedDoclets(doclet, doclets);
	}

	doclets.index[TAG_NAME] = [];
};

exports.handlers = {};
exports.handlers.parseComplete = function (e) {

//	var files = e.sourcefiles;
	var doclets = e.doclets;

	indexAll(doclets);
	resolveRefDoc(doclets);

};
