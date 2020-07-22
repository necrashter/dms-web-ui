
var policyView = null;

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

function trivialPolicy(grph) {
	// policy starts with null, because it represents the initial
	// state, before any actions are taken
	let steps = [null];
	// we can only activate unknown nodes
	let nodesToActivate = grph.nodes.filter(node => node.status == 0);
	while(nodesToActivate.length > 0) {
		let remaining = nodesToActivate.length;
		let nextNodes = Math.min(remaining, Math.ceil(Math.random()*3));
		steps.push({
			nodes: nodesToActivate.splice(0, nextNodes),
		});
	}
	return new Policy(grph, steps);
}

class Policy {
	constructor(_graph, steps) {
		this.graph = _graph;
		this.steps = steps;
		this.index = 0;
	}
	goTo(index) {
		this.index = index;
		for(let i=1; i<this.steps.length; ++i) {
			let nodes = this.steps[i].nodes;
			if(i <= index) {
				nodes.forEach(node => node.status = 1);
			} else {
				nodes.forEach(node => node.status = 0);
			}
		}
	}
	/**
	 * Calculates the probability of failure of the specified step, relative
	 * to current step.
	 */
	successProbability(index) {
		let p = 1;
		for(let i = this.index+1; i<=index; ++i) {
			let nodes = this.steps[i].nodes;
			nodes.forEach(node => {
				p *= (1-node.pf);
			});
		}
		return p;
	}
	getName(d) {
		if(d==null) return "Initial Status";
		else {
			return "Activate Nodes "+
				(d.nodes.map(node => "#"+node.index).join(", "));
		}
	}
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
			.text(`You can either request a solution from the server, or
				synthesize a trivial solution on the client-side for testing`);
		this.div.append("div").classed("blockButton", true)
			.text("Request Policy From Server")
			.on("click", this.requestPolicy.bind(this));
		this.div.append("div").classed("blockButton", true)
			.text("Synthesize Trivial Policy")
			.on("click", this.createTrivialPolicy.bind(this));
	}
	requestPolicy() {
		this.div.html("Waiting response from server...");
		let json = this.graph.getJson();
		Network.post("/policy", json).then(response => {
			let policy = JSON.parse(response);
			console.log(policy)
			// First make every bus "Unknown"
			this.graph.nodes.forEach(node => {
				node.status = 0;
			});
			// first step will be null, representing the initial 
			// status where everything is Unknown
			let steps = [null];
			let current = 0;
			let currentState = policy.states[current];
			let states = [currentState];
			while(current < policy.states.length){
				let actions = policy.transitions[current];
				let action = actions[policy.policy[current]];
				let next = action[0][0] - 1;
				let nextState = policy.states[next];
				if(!nextState) break;
				states.push(nextState);
				let nodes = [];
				for(let i =0; i<currentState.length; ++i) {
					if(currentState[i] != nextState[i]) {
						nodes.push(this.graph.nodes[i]);
					}
				}
				if(nodes.length ==0) break;
				steps.push({
					nodes: nodes
				});
				current = next;
				currentState = nextState;
			}
			console.log(states);
			this.setPolicy(new Policy(this.graph, steps));
			this.graph.rerender();
		})
		/*
		.catch(error => {
			this.div.html("");
			this.div.append("b").text("Failed to get policy")
				.style("color","red");
			this.div.append("p").text(error)
				.style("color","red");
			this.div.append("div").classed("blockButton", true)
				.text("Go Back")
				.on("click", this.selectPolicyView.bind(this));
		});
		*/
	}
	setPolicy(policy) {
		this.policy = policy;
		this.createMarkerLayer();
		this.policyNavigator();
	}
	createTrivialPolicy() {
		this.infoText = "A trivial policy has been generated.";
		this.setPolicy(trivialPolicy(this.graph));
	}
	goToPolicyStep(index) {
		this.policy.goTo(index);
		this.graph.rerender();
		this.policyNavigator();
	}
	createMarkerLayer() {
		this.markers = [];
		for(let i=1; i<this.policy.steps.length; ++i) {
			let nodes = this.policy.steps[i].nodes;
			nodes.forEach(node => {
				let m = L.marker(node.latlng, {
					icon: getGraphIcon(i),
					pane: "resources"
				});
				m.on("click", () => this.goToPolicyStep(i));
				this.markers.push(m);
			});
		}
		this.markerLayer = L.layerGroup(this.markers);
		//this.markerLayer.addTo(Map);
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
		if(this.policy.index>0) {
			prev.on("click", () => {
				this.goToPolicyStep(this.policy.index-1);
			});
		} else {
			prev.classed("disabled", true);
		}
		if(this.policy.index < this.policy.steps.length -1) {
			next.on("click", () => {
				this.goToPolicyStep(this.policy.index+1);
			});
			let p = this.policy.successProbability(this.policy.index+1);
			this.div.append("p").text("Success Probability for next step: "+
				p.toFixed(3));
		} else {
			next.classed("disabled", true);
		}
		// lists policy steps
		let stepList = this.div.append("div").classed("selectList", true);
		stepList.selectAll("div").data(this.policy.steps).join("div")
			.text(this.policy.getName)
			.attr("class", (_, i) => {
				if(i > this.policy.index) return "disabled";
				else if(i == this.policy.index) return "currentIndex";
				else return "";
			})
			.on("click", (_, i) => {
				this.goToPolicyStep(i);
			});
		{
			let div = this.div.append("div").classed("customCheckbox", true);
			let checkbox = div.append("input")
				.attr("id", "showNums")
				.attr("type", "checkbox")
				.on("change", () => {
					if(checkbox.node().checked)
						this.markerLayer.addTo(Map);
					else
						this.markerLayer.remove();
				})
				.property("checked", this.markerLayer._map != null);
			div.append("label")
				.attr("for", "showNums")
				.text("Show Numbers on Map");
		}
		if(this.policy.index == this.policy.steps.length-1) {
			let endDiv = this.div.append("div");
			endDiv.append("h2").text("Congratulations!");
			endDiv.append("p")
				.text("You have reached the end of the policy.");
			endDiv.style("opacity", 0)
				.transition().duration(500)
				.style("opacity", 1);
		}
	}
	destroy() {
		if(this.markerLayer) this.markerLayer.remove();
	}
}
