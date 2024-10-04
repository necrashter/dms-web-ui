function getLat(latlng) {
	return latlng.lat || latlng[0];
}

function getLng(latlng) {
	return latlng.lng || latlng[1];
}

function toRadians(degrees) {
	return degrees * Math.PI / 180;
}

// Given 2 latitude and longitude values, returns the distance in kilometers.
// Results in inaccuracies up to 0.5%
function earthDistance(pointA, pointB) {
	const EARTH_RADIUS = 6373.0; // approximate radius of earth in km

	const lat1Rad = toRadians(getLat(pointA));
	const lon1Rad = toRadians(getLng(pointA));
	const lat2Rad = toRadians(getLat(pointB));
	const lon2Rad = toRadians(getLng(pointB));

	const dlon = lon2Rad - lon1Rad;
	const dlat = lat2Rad - lat1Rad;
	const a = Math.sin(dlat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dlon / 2) ** 2;
	const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return EARTH_RADIUS * c;
}


class DistanceMeasuringTool {
	constructor(map) {
		this.map = map;

		this.distance = null;
		this.line = null;
		this.startPoint = null;
		this.endPoint = null;
	}
	onContextMenu(event) {
		let menu = d3.select("#ContextMenu");
		menu.append("div")
			.text("Measure Distance")
			.on("click", () => {
				let position = [event.latlng.lat, event.latlng.lng];
				this.startPoint = position;
				this.endPoint = position;
				this.line = L.polyline([this.startPoint, this.endPoint], {
					color: "#111",
					dashArray: "10, 10",
					weight: 2,
					smoothFactor: 1,
					pane: "distanceTool"
				});
				this.line.addTo(this.map);
				this.distance = 0.0;
			});
	}
	onMouseMove(event) {
		if (this.line) {
			let newLatLng = {lat: event.latlng.lat, lng: event.latlng.lng};
			this.line._latlngs[1] = newLatLng;
			this.line.redraw();
			this.distance = earthDistance(this.line._latlngs[0], this.line._latlngs[1]);
		}
	}
	onClick(event) {
		if (this.line) {
			this.line.remove();
			this.line = null;
			this.distance = null;
		}
	}
}
