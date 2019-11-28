/**
 * Register tag @copydoc
 *
 * syntax:
 * @copydoc SYMBOL_LINK
 *
 * will copy the docs of SYMBOL_LINK for all tags, that have not been defined in the doc itself
 *
 * in difference to @borrows (or @inheritDoc), @copydoc copies the jsdocs from another symbol without overwriting anything
 * e.g. if @public is defined in this symbol, and the jsdocs from the other symbol have "access" private, then the "access" for the referencing symbol is kept public
 *
 *
 * adapted from jsdoc3 sources (Apache License 2.0), specifically from jsdoc/tag/dictionary/definitions
 */

var TAG_NAME = 'copydoc';

/////////////////////////////////////////////////////////////////////

var addRef = function(doclet, source) {
    var info = { from: source };

    if (!doclet[TAG_NAME]) {
    	doclet[TAG_NAME] = [];
    }
    doclet[TAG_NAME].push(info);
};

function parseRefDoc(_doclet, tag) {
    var m = /^([\s\S]+?)\s*$/.exec(tag.text);
    if (m) {
        if (m[1]) {
            return { source: m[1] };
        }
        return {};
    } else {
        return {};
    }
}

exports.TAG_NAME = TAG_NAME;
//register the tag
exports.defineTags = function(dictionary) {

	dictionary.defineTag(TAG_NAME, {
        mustHaveValue: true,
	    onTagged: function(doclet, tag) {
            var refdoc = parseRefDoc(doclet, tag);
            addRef(doclet, refdoc.source);
        }
	});

};
