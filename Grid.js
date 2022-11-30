let GridDefaults = {
  latSize: 0.002,
  lngSize: 0.003,
  latOffset: 0.0,
  lngOffset: 0.0,
};

class LatLngGrid {
  constructor(options) {
    options = options != null ? options : GridDefaults;
    Object.assign(this, options);
  }

  snap(latlng) {
    if (Array.isArray(latlng)) {
      latlng[0] = Math.round(latlng[0] / this.latSize) * this.latSize + this.latOffset;
      latlng[1] = Math.round(latlng[1] / this.lngSize) * this.lngSize + this.lngOffset;
    } else {
      latlng.lat = Math.round(latlng.lat / this.latSize) * this.latSize + this.latOffset;
      latlng.lng = Math.round(latlng.lng / this.lngSize) * this.lngSize + this.lngOffset;
    }
  }
}

let GlobalGrid = new LatLngGrid();

function getGridSteps(low, high, size, offset, maxSteps) {
  let lowStep = Math.floor(low / size);
  let highStep = Math.ceil(high / size);

  if (maxSteps != null && highStep - lowStep + 1 > maxSteps) {
    return [];
  }

  let steps = [];
  for (let i = lowStep; i <= highStep; ++i) {
    steps.push(i * size + offset);
  }
  return steps;
}

L.Grid = L.LayerGroup.extend({
	options: {
    grid: GlobalGrid,

    maxSteps: 200,

		// Path style for the grid lines
		lineStyle: {
			stroke: true,
			color: "#111",
			opacity: 0.6,
			weight: 1
		},
		
		// Redraw on move or moveend
		redraw: "moveend",
	},

	initialize: function (options) {
		L.LayerGroup.prototype.initialize.call(this);
		L.Util.setOptions(this, options);
	},

	onAdd: function (map) {
		this._map = map;

		this.redraw();

    this.listener = () => {
			this.redraw();
		};
		this._map.on("viewreset "+ this.options.redraw, this.listener);

		this.eachLayer(map.addLayer, map);
	},
	
	onRemove: function (map) {
		map.off("viewreset "+ this.options.redraw, this.listener);
		this.eachLayer(this.removeLayer, this);
	},

	redraw: function () {
		this.eachLayer(this.removeLayer, this);

		// Pad the bounds to make sure we draw the lines a little longer
		this._bounds = this._map.getBounds().pad(0.5);

		for (let lat of this._latSteps()) {
			if (Math.abs(lat) > 90) {
				continue;
			}
			this.addLayer(this._horizontalLine(lat));
		}

		for (let lng of this._lngSteps()) {
			this.addLayer(this._verticalLine(lng));
		}

		return this;
	},

	_latSteps: function () {
		return getGridSteps(
			this._bounds.getSouth(),
			this._bounds.getNorth(),
			this.options.grid.latSize,
			this.options.grid.latOffset,
      this.options.maxSteps,
		);
	},
	_lngSteps: function () {
		return getGridSteps(
			this._bounds.getWest(),
			this._bounds.getEast(),
			this.options.grid.lngSize,
			this.options.grid.lngOffset,
      this.options.maxSteps,
		);
	},

	_verticalLine: function (lng) {
		return new L.Polyline([
			[this._bounds.getNorth(), lng],
			[this._bounds.getSouth(), lng]
		], this.options.lineStyle);
	},
	_horizontalLine: function (lat) {
		return new L.Polyline([
			[lat, this._bounds.getWest()],
			[lat, this._bounds.getEast()]
		], this.options.lineStyle);
	},
});

L.grid = function (options) {
	return new L.Grid(options);
};

