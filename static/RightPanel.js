
var policyView = null;

function getGraphIcon(name) {
	let width = name.length*6+40;
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
						policyView = null;
						graph.clear();
						graph = null;
						openSelectGraph();
					});
			});
		content.append("h1").text("2. Synthesize Policy");
		policyView = new PolicyView(graph, content.append("div"));
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

class PolicyView {
	/**
	 * Takes a graph and div.
	 * div must be a d3 selection
	 */
	constructor(_graph, div) {
		this.div = div;
		this.graph = _graph;
		this.selectPolicyView();
	}
	selectPolicyView() {
		this.div.html("");
		this.div.append("p")
			.text(`Currently this cannot generate a proper solution,
				but it can synthesize a trivial policy where every 
				unknown node is energized in order.`);
		this.div.append("div").classed("blockButton", true)
			.text("Synthesize Trivial Policy")
			.on("click", this.createTrivialPolicy.bind(this));
	}
	createTrivialPolicy() {
		// policy starts with null, because it represents the initial
		// state, before any actions are taken
		this.policy = [null];
		// we can only activate unknown nodes
		let nodesToActivate = this.graph.nodes.filter(node => node.status == 0);
		while(nodesToActivate.length > 0) {
			let remaining = nodesToActivate.length;
			let nextNodes = Math.min(remaining, Math.ceil(Math.random()*3));
			this.policy.push({
				nodes: nodesToActivate.splice(0, nextNodes),
			});
		}
		this.policyIndex = 0;
		this.infoText = "A trivial policy has been generated.";
		this.policyNavigator();
	}
	goToPolicyStep(index) {
		this.policyIndex = index;
		for(let i=1; i<this.policy.length; ++i) {
			let nodes = this.policy[i].nodes;
			if(i <= index) {
				nodes.forEach(node => node.status = 1);
			} else {
				nodes.forEach(node => node.status = 0);
			}
		}
		this.graph.rerender();
		this.policyNavigator();
	}
	/**
	 * Calculates the probability of failure of the specified step, relative
	 * to current step.
	 */
	successProbability(index) {
		let p = 1;
		for(let i = this.policyIndex+1; i<=index; ++i) {
			let nodes = this.policy[i].nodes;
			nodes.forEach(node => {
				p *= (1-node.pf);
			});
		}
		return p;
	}
	policyNavigator() {
		this.div.html("");
		if(this.infoText) this.div.append("p").text(this.infoText);
		this.div.append("p")
			.text(`You can use the buttons or 
				click on a step to jump directly to it.`);
		let buttonDiv = this.div.append("div").classed("policyControls", true);
		let prev = buttonDiv.append("div").classed("blockButton", true)
			.text("Previous Step");
		let next = buttonDiv.append("div").classed("blockButton", true)
			.text("Next Step");
		if(this.policyIndex>0) {
			prev.on("click", () => {
				this.goToPolicyStep(this.policyIndex-1);
			});
		} else {
			prev.classed("disabled", true);
		}
		if(this.policyIndex < this.policy.length -1) {
			next.on("click", () => {
				this.goToPolicyStep(this.policyIndex+1);
			});
			let p = this.successProbability(this.policyIndex+1);
			this.div.append("p").text("Success Probability for next step: "+
				p.toFixed(3));
		} else {
			next.classed("disabled", true);
		}
		// lists policy steps
		let stepList = this.div.append("div").classed("selectList", true);
		stepList.selectAll("div").data(this.policy).join("div")
			.text(d => {
				if(d==null) return "Initial Status";
				else {
					return "Activate Nodes "+
						(d.nodes.map(node => "#"+node.index).join(", "));
				}
			})
			.attr("class", (_, i) => {
				if(i > this.policyIndex) return "disabled";
				else if(i == this.policyIndex) return "currentIndex";
				else return "";
			})
			.on("click", (_, i) => {
				this.goToPolicyStep(i);
			});
		if(this.policyIndex == this.policy.length-1) {
			let endDiv = this.div.append("div");
			endDiv.append("h2").text("Congratulations!");
			endDiv.append("p")
				.text("You have reached the end of the policy.");
			endDiv.style("opacity", 0)
				.transition().duration(500)
				.style("opacity", 1);
		}
	}
}
