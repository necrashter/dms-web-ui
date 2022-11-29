let GridDefaults = {
  latSize: 0.002,
  lngSize: 0.003,
  latOffset: 0.0,
  lngOffset: 0.0,
};

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
    grid: GridDefaults,

    maxSteps: 200,

		// Path style for the grid lines
		lineStyle: {
			stroke: true,
			color: '#111',
			opacity: 0.6,
			weight: 1
		},
		
		// Redraw on move or moveend
		redraw: 'moveend',
	},

	initialize: function (options) {
		L.LayerGroup.prototype.initialize.call(this);
		L.Util.setOptions(this, options);
	},

	onAdd: function (map) {
		this._map = map;

		let grid = this.redraw();
		this._map.on('viewreset '+ this.options.redraw, function () {
			grid.redraw();
		});

		this.eachLayer(map.addLayer, map);
	},
	
	onRemove: function (map) {
		// remove layer listeners and elements
		map.off('viewreset '+ this.options.redraw, this.map);
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

