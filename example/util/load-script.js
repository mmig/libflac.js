
function loadScripts(scriptUrls, cb){
	function loadNext(err){
		if(err){
			console.error('error ', err);
			return cb(err);
		}
		scriptUrls.length? loadScripts(scriptUrls, cb) : cb(null);
	}
	var s = scriptUrls.shift();
	addScript(s, loadNext);
}

function addScript(scriptUrl, cb) {

	var head = document.getElementsByTagName('head')[0];
	var script = document.createElement('script');
	script.type = 'text/javascript';
	script.src = scriptUrl;
	script.onload = function() {
		cb && cb.call(this, null);
	};
	script.onerror = function(e) {
		var msg = 'Loading script failed for "' + scriptUrl + '" ';
		cb? cb.call(this, msg + e) : console.error(msg, e);
	};
	head.appendChild(script);
}
