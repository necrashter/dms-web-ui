
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

Icons.crosshair = L.icon({
    iconUrl: 'assets/target.png',
    iconSize:     IconSize, // size of the icon
    iconAnchor:   IconAnchor, // point of the icon which will correspond to marker's location
});

function readFile(event) {
	var file = event.target.files[0];
	if (!file) {
		return;
	}
	var reader = new FileReader();
	reader.onload = function(e) {
		var contents = e.target.result;
		console.log(contents);
	};
	reader.readAsText(file);
}

/**
 * Namespace/Singleton for Graph functions
 * Can be converted into a class if needed, but I didn't do it
 * since there will be only one graph
 */
var Graph = {
	/**
	 * 0: normal mode
	 * 1: edit mode
	 */
	mode: 0,
	lastHover: { type: null, data: null, hovered: false },
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
		Graph.lastHover.type = "node";
		Graph.lastHover.data = event.target.node;
		Graph.lastHover.pos = event.target._latlng;
		Graph.lastHover.hovered = true;
		event.target.setRadius(nodeRadius*1.25);
		Tooltip.div.innerHTML =
			`Node #${Graph.nodes.indexOf(event.target.node)} <br/>
	  Lat: ${Math.round(10000*event.target._latlng.lat)/10000} <br/>
	  Lng: ${Math.round(10000*event.target._latlng.lng)/10000}`
		Tooltip.show();
		Tooltip.onMouseMove(event);
	},
	nodeOnMouseOut: function (event) {
		Graph.lastHover.hovered = false;
		event.target.setRadius(nodeRadius);
		Tooltip.hide();
	},
	nodeOnClick: function (event) {
		let node = event.target.node;
		BottomRightPanel.innerHTML = `
			<h1>Node #${Graph.nodes.indexOf(node)}</h1>
			<p>Lat: ${Math.round(10000*event.target._latlng.lat)/10000}</p>
			<p>Lng: ${Math.round(10000*event.target._latlng.lng)/10000}</p>
			<p>Connected to ${node.branches.length} branches.</p>
			`;
		if(node.externalBranches.length>0) {
			BottomRightPanel.innerHTML += "<p>Connected to a resource.</p>";
		}
	},
	resourceOnMouseOver: function(event) {
		Graph.lastHover.type = "resource";
		Graph.lastHover.data = event.target.data;
		Graph.lastHover.pos = event.target._latlng;
		Graph.lastHover.hovered = true;
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
	resourceOnClick: function(event) {
		let resource = event.target.data;
		let name = resource.type ? "DER" : "Transmission Grid";
		BottomRightPanel.innerHTML = `
			<h1>${name}</h1>
			${resource.type ? "<p>Type: "+resource.type+"</p>" : ""}
			<p>Lat: ${Math.round(10000*event.target._latlng.lat)/10000}</p>
			<p>Lng: ${Math.round(10000*event.target._latlng.lng)/10000}</p>
			`;
	},
	resourceOnMouseOut: function(event) {
		Graph.lastHover.hovered = false;
		Tooltip.hide();
	},
	branchOnMouseOver: function (event) {
		Graph.lastHover.type = "branch";
		Graph.lastHover.data = event.target.branch;
		Graph.lastHover.pos = event.target._latlng;
		Graph.lastHover.hovered = true;
		event.target.setStyle({ weight: hoveredLineWeight });
		let pf = event.target.branch.pf;
		let status;
		switch(event.target.branch.status){
			case -1: status="Damaged"; break;
			case 1: status="Energized"; break;
			default: status="Unknown"; break;
		}
		Tooltip.div.innerHTML =
			`Branch #${Graph.branches.indexOf(event.target.branch)} <br/>
	  Status: ${status} <br/>
			P<sub>f</sub>: ${pf ? pf : "Unknown"}`
		Tooltip.show();
		Tooltip.onMouseMove(event);
	},
	branchOnClick: function(event) {
		let branch = event.target.branch;
		let pf = event.target.branch.pf;
		let status;
		switch(branch.status){
			case -1: status="Damaged"; break;
			case 1: status="Energized"; break;
			default: status="Unknown"; break;
		}
		BottomRightPanel.innerHTML =
			`<h1>Branch #${Graph.branches.indexOf(branch)} </h1>
			  <p>Status: ${status}</p>
			  <p>Connects nodes ${branch.nodes[0]} and ${branch.nodes[1]}</p>
			  <p>Probability of Failure: ${pf ? pf : "Unknown"}</p>
			  ${branch.status>0 ? "<p>Source: "+branch.source+"</p>" : ""}
			`;
	},
	branchOnMouseOut: function (event) {
		Graph.lastHover.hovered = false;
		event.target.setStyle({ weight: lineWeight });
		Tooltip.hide();
	},
	externalBranchOnMouseOver: function (event) {
		Graph.lastHover.type = "externalBranch";
		Graph.lastHover.data = event.target.branch;
		Graph.lastHover.pos = event.target._latlng;
		Graph.lastHover.hovered = true;
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
		Graph.lastHover.hovered = false;
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
			marker.on("click", this.resourceOnClick);
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
			line.on("click", this.branchOnClick);
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
	},
	setMode: function(mode) {
		if(this.mode == mode) return;
		this.mode = mode;
		if(this.mode == 1) {
			TopLeftPanel.classList.add("warning");
			TopLeftPanel.innerText = "EDIT MODE";
			let topbar = d3.create("div").attr("id", "TopBar");
			topbar.append("label").classed("blockButton", true)
				.classed("alt", true)
				.attr("for", "fileInput")
				.text("Load");
			topbar.append("input").attr("id", "fileInput")
				.attr("type", "file")
				.node().addEventListener("change", readFile, false);
			topbar.append("div").classed("blockButton", true)
				.classed("alt", true)
				.text("Save")
				.on("click", function() {
					//TODO
				});
			topbar.append("div").classed("blockButton", true)
				.classed("alt", true)
				.text("Clear")
				.on("click", function() {
					Graph.nodes = [];
					Graph.branches = [];
					Graph.externalBranches = [];
					Graph.resources = [];
					Graph.rerender();
				});
			topbar.style("transform", "translate(0, -53px)")
				.transition().duration(1000)
				.style("transform", "translate(0, 0)");
			this.topbar = topbar;
			HUD.appendChild(topbar.node());
		} else {
			TopLeftPanel.classList.remove("warning");
			TopLeftPanel.innerText = "METU CPS";
			let topbar = this.topbar;
			topbar.transition().duration(1000)
				.style("transform", "translate(0, -53px)")
				.on("end", () => { topbar.remove(); });
		}
	},
	addBranch: function(source, target) {
		let i0 = this.nodes.indexOf(source);
		let i1 = this.nodes.indexOf(target);
		this.branches.push({
			nodes: [i0, i1],
			status: 0,
		});
	},
	addExternalBranch: function(source, target) {
		let i0 = this.resources.indexOf(source);
		let i1 = this.nodes.indexOf(target);
		this.externalBranches.push({
			source: i0,
			node: i1,
			status: 1,
		});
	},
	handleKeyDown: function(event) {
		if(this.mode == 1) {
			switch(event.key) {
				case "a":
					if(!Map.mousePos) return;
					let newNode = {
						"latlng": Map.mousePos
					}
					this.nodes.push(newNode);
					this.rerender();
					break;
				case "s":
					if(!this.lastHover.hovered) {
						if(this.crosshair) this.crosshair.remove();
						this.lastSelect = null;
						return;
					}
					if(this.lastSelect) {
						if(this.lastSelect.data !== this.lastHover.data) {
							if(this.lastSelect.type === "node") {
								if(this.lastHover.type === "node") {
									this.addBranch(
										this.lastSelect.data,
										this.lastHover.data);
									this.rerender();
								} else if (this.lastHover.type === "resource") {
									this.addExternalBranch(
										this.lastHover.data,
										this.lastSelect.data);
									this.rerender();
								}
							} else if(this.lastSelect.type === "resource") {
								if(this.lastHover.type === "node") {
									this.addExternalBranch(
										this.lastSelect.data,
										this.lastHover.data);
									this.rerender();
								}
							}
						}
					}
					if(this.crosshair) this.crosshair.remove();
					this.crosshair = L.marker(this.lastHover.pos, {
						icon: Icons.crosshair
					}).addTo(Map);
					this.lastSelect = Object.assign({}, this.lastHover);
					break;
				case "x":
					if(this.lastHover.hovered) {
						let i;
						let data = this.lastHover.data;
						switch(this.lastHover.type) {
							case "node":
								i = this.nodes.indexOf(data);
								this.nodes.splice(i, 1);
								this.branches = this.branches.filter(b => {
									return !b.nodes.includes(i);
								});
								// decrease the indexes of following nodes
								this.branches.forEach((b) => {
									b.nodes = b.nodes.map(n =>
										n > i ? n-1 : n
									);
								});
								this.externalBranches = this.externalBranches.filter(b => b.node != i);
								this.externalBranches.forEach((b) => {
									if(b.node > i) b.node--;
								});
								this.rerender();
								break;
							case "resource":
								i = this.resources.indexOf(data);
								this.resources.splice(i, 1);
								this.branches.forEach(b => {
									if(b.source === i) {
										if(b.status == 1) b.status = 0;
										b.source = null;
									} else if(b.source > i) {
										b.source--;
									}
								});
								this.externalBranches = this.externalBranches.filter(b => b.source !== i);
								this.externalBranches.forEach(b => {
									if(b.source === i) {
										if(b.status == 1) b.status = 0;
										b.source = null;
									} else if(b.source > i) {
										b.source--;
									}
								});
								this.rerender();
								break;
							case "branch":
								i = this.branches.indexOf(data);
								this.branches.splice(i, 1);
								this.rerender();
								break;
							case "externalBranch":
								i = this.externalBranches.indexOf(data);
								this.externalBranches.splice(i, 1);
								this.rerender();
								break;
							default:
								break;
						}
					}
					break;
				case "q":
					if(!Map.mousePos) return;
					this.resources.push({
						latlng: Map.mousePos,
						type: null,
					});
					this.rerender();
					break;
				case "w":
					if(!Map.mousePos) return;
					this.resources.push({
						latlng: Map.mousePos,
						type: "solar",
					});
					this.rerender();
					break;
				default:
					break;
			}
		}
	},
	rerender: function() {
		Graph.markerLayer.remove();
		Graph.resourceLayer.remove();
		Graph.circleLayer.remove();
		Graph.branchLayer.remove();
		Graph.externalBranchLayer.remove();
		this.render(Map);
	},
	getJson: function() {
		let g = {};
		g.nodes = this.nodes.map(n => {
			return { latlng: n.latlng }
		});
		g.branches = this.branches;
		g.externalBranches = this.externalBranches;
		g.resources = this.resources;
		return JSON.stringify(g);
	},
}; //end Graph


window.addEventListener("keydown", function(event) {
	switch(event.key){
		case "F1":
			Graph.setMode(0);
			break;
		case "F2":
			Graph.setMode(1);
			break;
		default:
			Graph.handleKeyDown(event);
			break;
	}
});
