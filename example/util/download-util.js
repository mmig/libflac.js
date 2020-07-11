"use strict"

/**
 *  create A-element for data BLOB and trigger download
 */
function forceDownload(blob, filename){
	var link = getDownloadLink(blob, filename, true);
	//NOTE: FireFox requires a MouseEvent (in Chrome a simple Event would do the trick)
	var click = document.createEvent("MouseEvent");
	click.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
	link.dispatchEvent(click);
}

/**
 *  create A-element for data BLOB
 */
function getDownloadLink(blob, filename, omitLinkLabel){
	var name = filename || 'output.flac';
	var url = (window.URL || window.webkitURL).createObjectURL(blob);
	var link = window.document.createElement('a');
	link.href = url;
	link.download = name;
	if(!omitLinkLabel){
		link.textContent = name;
	}
	return link;
}
