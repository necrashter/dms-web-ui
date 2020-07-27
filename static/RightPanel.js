
function getGraphIcon(name) {
	let width = name.toString().length*6+40;
	return L.divIcon({
		className: 'divIcon',
		html: `<div class='blockMarker'>${name}</div>`,
		iconSize: [width,50],
		iconAnchor: [width/2,25]
	});
}


var markers;
function selectGraph(choices, prebody=null) {
	let markerLayer;
	let content = d3.select("#RightPanelContent").html("");
	content.style("opacity", 0);
	let header = content.append("h1").text("1. Load Graph");
	let body = content.append("div").style("overflow", "hidden");
	if(prebody) body.call(prebody);
	body.append("p").text("Select a graph to load: ");
	let list = body.append("div").classed("selectList", true);
	let selectFun = d => {
		d.load();
		markerLayer.remove();
		header.classed("disabled", true);
		body.transition().duration(500).style("height", "0")
			.on("end", () => body.html(""));
		content.append("div").classed("blockButton", true)
			.text("Select another graph")
			.on("click", () => {
				content.transition().duration(300).style("opacity", "0")
					.on("end", () => {
						policyView.destroy();
						policyView = null;
						graph.clear();
						graph = null;
						openSelectGraph();
					});
			});
		content.append("h1").text("2. Synthesize Policy");
		selectPolicyView(content.append("div"), graph);
		//policyView = new PolicyView(graph, content.append("div"));
	};
	markers = choices.map((g,i) => {
		let m = L.marker(g.view, {
			icon: getGraphIcon(g.name),
			pane: "resources"
		});
		m.on("click", () => selectFun(choices[i]));
		m.on("mouseover", () => {
			list.selectAll("div").nodes()[i].classList.add("hover");
		});
		m.on("mouseout", () => {
			list.selectAll("div").nodes()[i].classList.remove("hover");
		});
		return m;
	})
	markerLayer = L.layerGroup(markers);
	list.selectAll("div").data(choices).join("div")
		.text(d => d.name)
		.on("click", selectFun)
		.on("mouseover", (_, i) => {
			let icon = markers[i]._icon;
			if(icon) icon.children[0].classList.add("hover");
		})
		.on("mouseout", (_, i) => {
			let icon = markers[i]._icon;
			if(icon) icon.children[0].classList.remove("hover");
		});
	content.transition().duration(300).style("opacity", 1);
	markerLayer.addTo(Map);
}

