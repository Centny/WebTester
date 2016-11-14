////////////////////////////////////////////////
var direct = 'DIRECT;';
var proxy = "PROXY 127.0.0.1:$PORT;";
var urls = $URLS;
function FindProxyForURL(url, host) {
	if (!url) {
		return direct;
	}
	for (var i = 0; i < urls.length; i++) {
		if (url.match(urls[i])) {
			return proxy;
		}
	}
	return direct;
}
////////////////////////////////////////////////