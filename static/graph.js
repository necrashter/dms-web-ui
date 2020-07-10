
/* constants related to rendering graph */
const energizedColor = "#0000FF";
const unenergizedColor = "#c70039";
const lineWeight = 6;
const hoveredLineWeight = 8;
const nodeRadius = 6;

const shadowColor = "#574f7d";

var Icons = {};

const IconSize = [50, 50];
const IconAnchor = [25, 25];

Icons.tower = L.divIcon({
	className: 'divIcon',
	html: "<div class='markerDiv'><img src='assets/tower.png' /></div>",
	iconSize: IconSize,
	iconAnchor: IconAnchor
});

Icons.solar = L.divIcon({
	className: 'divIcon',
	html: "<div class='markerDiv'><img src='assets/solar-panel.png' /></div>",
	iconSize: IconSize,
	iconAnchor: IconAnchor
});



/**
 * Namespace/Singleton for Graph functions
 * Can be converted into a class if needed, but I didn't do it
 * since there will be only one graph
 */
var Graph = {
	/**
	 * Contains objects of form 
	 * { latlng: [lat, lng] }
	 * where lat and lng are the latitude and longtitude of the node.
	 * A property called "branches" will be used to store the branches that
	 * are connected to this node.
	 */
	nodes: [],
	/**
	 * Contains objects of form
	 * { nodes: [i_0, i_1], status: s, source: L }
	 * where i_0 and i_1 are the indexes of nodes that the branch connects,
	 * s is 0 for unknown, -1 for damaged, 1 for energized
	 * L is the index of the DER that powers the branch if the branch is energized
	 */
	branches: [],
	/**
	 * Contains objects of form
	 * { node: i, status: s, source: L }
	 * similar to branches, but connects a resource and node
	 */
	externalBranches: [],
	/**
	 * Includes transmission grid and DERs
	 * { latlng: [lat, lng], type: type }
	 * where type is a string describing the type of DER or null for transmission grid
	 */
	resources: [],
	/**
	 * Loads the graph data, doesn't render
	 */
	loadGraph: function(graph) {
		Graph.nodes = graph.nodes;
		Graph.branches = graph.branches;
		Graph.externalBranches = graph.externalBranches;
		Graph.resources = graph.resources;
	},

	/**
	 * Event handlers
	 */
	nodeOnMouseOver: function (event) {
		event.target.setRadius(nodeRadius*1.25);
		Tooltip.div.innerHTML =
			`Node #${Graph.nodes.indexOf(event.target.node)} <br/>
	  Lat: ${Math.round(10000*event.target._latlng.lat)/10000} <br/>
	  Lng: ${Math.round(10000*event.target._latlng.lng)/10000}`
		Tooltip.show();
		Tooltip.onMouseMove(event);
	},
	nodeOnMouseOut: function (event) {
		event.target.setRadius(nodeRadius);
		Tooltip.hide();
	},
	nodeOnClick: function (event) {
		let node = event.target.node;
		console.log(node);
	},
	resourceOnMouseOver: function(event) {
		let resource = event.target.data;
		let name = resource.type ? "DER" : "Transmission Grid";
		Tooltip.div.innerHTML =
			`${name} <br/>
			${resource.type ? "Type: "+resource.type+"<br/>" : ""}
	  Lat: ${Math.round(10000*event.target._latlng.lat)/10000} <br/>
	  Lng: ${Math.round(10000*event.target._latlng.lng)/10000}`
		Tooltip.show();
		Tooltip.onMouseMove(event);
	},
	resourceOnMouseOut: function(event) {
		Tooltip.hide();
	},
	branchOnMouseOver: function (event) {
		event.target.setStyle({ weight: hoveredLineWeight });
		let status;
		switch(event.target.branch.status){
			case -1: status="Damaged"; break;
			case 1: status="Energized"; break;
			default: status="Unknown"; break;
		}
		Tooltip.div.innerHTML =
			`Branch #${Graph.branches.indexOf(event.target.branch)} <br/>
	  Status: ${status}`
		Tooltip.show();
		Tooltip.onMouseMove(event);
	},
	branchOnMouseOut: function (event) {
		event.target.setStyle({ weight: lineWeight });
		Tooltip.hide();
	},
	externalBranchOnMouseOver: function (event) {
		event.target.setStyle({ weight: hoveredLineWeight });
		let status;
		switch(event.target.branch.status){
			case -1: status="Damaged"; break;
			case 1: status="Energized"; break;
			default: status="Unknown"; break;
		}
		Tooltip.div.innerHTML =
			`External Branch #${Graph.externalBranches.indexOf(event.target.branch)} <br/>
	  Status: ${status}`
		Tooltip.show();
		Tooltip.onMouseMove(event);
	},
	externalBranchOnMouseOut: function (event) {
		event.target.setStyle({ weight: lineWeight });
		Tooltip.hide();
	},


	/**
	 * Renders the Graph.nodes into new layers
	 */
	render: function (map) {
		Graph.nodes.forEach(node => {
			node.branches = []; // holds the branch elements displayed on map
			node.externalBranches = []; // holds the branch elements that connect to DERs
		});
		var markers = [];
		var circles = [];
		var branches = [];
		var externalBranches = [];
		var resourceMarkers = [];

		for(var i = 0; i<this.nodes.length; ++i) {
			let node = this.nodes[i];
			let latlng = node.latlng;
			let color = shadowColor;

			//markers.push(L.marker(latlng, {icon: testIcon}));
			let circle = L.circleMarker(latlng, {
				color: color,
				fillColor: color,
				fillOpacity: 1.0,
				radius: nodeRadius
			});
			circle.node = node;
			circle.on("mouseover", this.nodeOnMouseOver);
			circle.on("mouseout", this.nodeOnMouseOut);
			circle.on("click", this.nodeOnClick);
			circles.push(circle);
		}
		// add resources
		for(var i = 0; i<this.resources.length; ++i) {
			let resource = this.resources[i];
			let type = resource.type ? resource.type : "tower";
			let marker = L.marker(resource.latlng, {icon: Icons[type]});
			marker.data = resource;
			marker.on("mouseover", this.resourceOnMouseOver);
			marker.on("mouseout",  this.resourceOnMouseOut);
			resourceMarkers.push(marker);
		}
		// add branches
		for(var i = 0; i<this.branches.length; ++i) {
			let branch = this.branches[i];
			let lineColor = (branch.status>0) ? energizedColor :
				(branch.status===0) ? shadowColor : unenergizedColor;
			let line = L.polyline( branch.nodes.map(j => Graph.nodes[j].latlng) , {
				color: lineColor,
				weight: lineWeight,
				smoothFactor: 1,
			});
			line.branch = branch;
			line.on("mouseover", this.branchOnMouseOver);
			line.on("mouseout", this.branchOnMouseOut);
			branches.push(line);
			Graph.nodes[branch.nodes[0]].branches.push(line);
			Graph.nodes[branch.nodes[1]].branches.push(line);
		}
		// add external branches
		for(var i = 0; i<this.externalBranches.length; ++i) {
			let branch = this.externalBranches[i];
			let lineColor = (branch.status>0) ? energizedColor :
				(branch.status===0) ? shadowColor : unenergizedColor;
			let line = L.polyline( [ //coordinates
				Graph.resources[branch.source].latlng,
				Graph.nodes[branch.node].latlng
			], {
				color: lineColor,
				weight: lineWeight,
				smoothFactor: 1,
			});
			// rename to externalBranch?
			line.branch = branch;
			line.on("mouseover", this.externalBranchOnMouseOver);
			line.on("mouseout", this.externalBranchOnMouseOut);
			externalBranches.push(line);
			Graph.nodes[branch.node].externalBranches.push(line);
		}
		Graph.markerLayer = L.layerGroup(markers);
		Graph.resourceLayer = L.layerGroup(resourceMarkers);
		Graph.circleLayer = L.layerGroup(circles);
		Graph.branchLayer = L.layerGroup(branches);
		Graph.externalBranchLayer = L.layerGroup(externalBranches);

		this.map = map;
		Graph.branchLayer.addTo(map);
		Graph.externalBranchLayer.addTo(map);
		Graph.circleLayer.addTo(map);
		Graph.resourceLayer.addTo(map);
	},
	/**
	 * Generates a random system with len nodes.
	 * For testing purposes.
	 */
	generateRandom: function (len) {
		const variety = 0.01;
		let lat = 41;
		let lng = 29.045;
		Graph.nodes = [];
		Graph.branches = [];
		for(var i =0; i<len; ++i) {
			lat += (Math.random()*variety)-(variety/2);
			lng += (Math.random()*variety)-(variety/2);
			let node = { latlng: [lat,lng] };
			if(i>0) {
				Graph.branches.push({
					nodes: [i-1, i],
					status: (Math.random() < 0.2) ? -1 : (Math.random() < 0.5) ? 0 : 1
				});
			}
			Graph.nodes.push(node);
		}
	}
}; //end Graph

