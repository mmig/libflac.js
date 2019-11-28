/**
 * Transform '@see <a href="the/url">some text</a>' to '@see {@link the/url|some text}'.
 *
 * Allow using HTML anchor tags within @see tags.
 *
 *
 *
 * This only looks into @see tags.
 */

function convertATags (text) {

	//do not proceed, if there is no <a>-tag present
	if( ! /<a[^>]+>(.*?)<\/a>/igm.test(text)){
		return; //////////////// EARLY EXIT ////////////
	}

	var isModified = false;
	var returnValue = text.replace(/<a[^>]+href\s*=\s*('((\\'|[^'])+)'|"((\\"|[^"])+)")[^>]*>(.*?)<\/a>/igm,function(_m, _str1, url1, _str2, url2, _rest, title){
		var url = url1? url1 : url2;
		if(url){
			isModified = true;
			title = title? title : url;
			return "{@link " + url + "|" + title + "}";
		}
    });

	if(isModified){
		return returnValue;
	}
	return;
}

function processSeeText(doclet, p){
	var t = doclet[p];
	var modText;
	if (t) {
		modText = convertATags(t);
		if(modText){
			doclet[p] = modText;
		}
	}
}

exports.handlers = {};
exports.handlers.newDoclet = function (e) {

    var doclet = e.doclet;
	var t, ts;
	//see-tag:
	// * process Array of Strings
	// * process <a> tags in text-@see tags
	t = doclet['see'];
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

		doclet['see'] = ts;

		for(var i=0,size=ts.length; i < size; ++i){
			processSeeText(ts, i);
		}

	}

};

////FIXM DEBUG and TEST:
//console.log('initialized plugin for A-tag conversion in @see...');
//try{
//	throw new Error('debug');//<- use this to catch the Error in the debugger...
//} catch(e){}
