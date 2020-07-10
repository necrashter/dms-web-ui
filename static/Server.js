/**
 * Namespace responsible for managing connection to server
 */
const Server = {};

/**
 * Get data from server
 */
Server.get = function get(url) {
	return new Promise(function(resolve, reject) {
		var req = new XMLHttpRequest();
		req.open('GET', url);

		req.onload = function() {
			// check if successful
			if (req.status == 200) {
				resolve(req.response);
			} else {
				reject(Error(req.statusText));
			}
		};
		req.onerror = function() {
			reject(Error("Network Error"));
		};
		req.send();
	});
};
