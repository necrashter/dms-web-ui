
var policyView = null;

function getNumberIcon(name) {
	let width = name.toString().length*7+20;
	return L.divIcon({
		className: 'divIcon',
		html: `<div class='numberMarker'>${name}</div>`,
		iconSize: [width,50],
		iconAnchor: [width/2,0]
	});
}

const ActivateIcon = L.divIcon({
	className: 'divIcon',
	html: `<div class='numberMarker'>Activate</div>`,
	iconSize: [80,50],
	iconAnchor: [40,0]
});

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
	return new LinearPolicy(grph, steps);
}

class LinearPolicy {
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

class InteractivePolicy {
	/**
	 * policy is the direct output from server
	 */
	constructor(_graph, policy) {
		this.graph = graph;
		for(let key in policy) {
			this[key] = policy[key];
		}
		this.end = false; // if true (No more actions available)
		this.previousStates = [];
		this.setState(0);
	}
	setState(state) {
		this.state = state;
		this.actions = this.transitions[this.state];
		this.action = this.actions[this.policy[this.state]];
		if(this.action.length == 1 && this.action[0][0]-1 == this.state) {
			this.end = true;
			this.nextNodes = null;
		} else {
			this.end = false;
			this.nextNodes = this._getNextNodes();
		}
	}
	_getNextNodes() {
		let currentState = this.states[this.state];
		let nextState = this.states[this.action[0][0] - 1];
		let nodes = [];
		for(let i =0; i<currentState.length; ++i) {
			if(currentState[i] != nextState[i]) {
				nodes.push(graph.nodes[i]);
			}
		}
		return nodes;
	}
	nextState() {
		let nextStates = this.action.map(a => a[0]-1);
		for(let i=0; i< this.graph.nodes.length; ++i) {
			let node = this.graph.nodes[i];
			// eliminate states that don't match
			nextStates = nextStates.filter(s => {
				let state = this.states[s];
				return (state[i] == "U" && node.status == 0) ||
					(state[i] == "D" && node.status < 0) ||
					(state[i] != "D" && state[i] != "U" && node.status > 0);
			});
		}
		if(nextStates.length !== 1) {
			console.error("nextStates.length is not 1");
			console.log("nextStates: ", nextStates);
			return;
		}
		this.previousStates.push(this.state);
		this.setState(nextStates[0]);
	}
	previousState() {
		let prev = this.previousStates.pop();
		if(prev === undefined) throw new Error("There's no previous state");
		this.setState(prev);
		this.graph.setState(this.states[this.state]);
	}
	nextStateAvailable() {
		return !this.end;
	}
}

function getStepsFromPolicy(policy) {
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
				nodes.push(graph.nodes[i]);
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
	return steps;
}

function selectPolicyView(div, graph) {
	function requestPolicy() {
		div.html("Waiting response from server...");
		let json = graph.getJson();
		Network.post("/policy", json).then(response => {
			let policy = JSON.parse(response);
			// First make every bus "Unknown"
			graph.nodes.forEach(node => {
				node.status = 0;
			});
			graph.rerender();

			div.html("");
			div.append("h3").text("Select Mode");
			div.append("p").text(`Interactive Mode allows you to select the
				result of each step as you run the policy.`);
			div.append("div").classed("blockButton", true)
				.text("Interactive Mode")
				.on("click", () => {
					policyView = new InteractivePolicyView(graph, div,
						new InteractivePolicy(graph, policy));
				});
			div.append("p").text(`In linear mode you will see the best case,
				where the activation of every bus is successful.`);
			div.append("div").classed("blockButton", true)
				.text("Linear Mode")
				.on("click", () => {
					let steps = getStepsFromPolicy(policy);
					policyView = new LinearPolicyView(graph, div,
						new LinearPolicy(graph, steps));
				});
		})
		.catch(error => {
			div.html("");
			div.append("b").text("Failed to get policy")
				.style("color","red");
			div.append("p").text(error)
				.style("color","red");
			div.append("div").classed("blockButton", true)
				.text("Go Back")
				.on("click", selectPolicyView);
		});
	}
	function createTrivialPolicy() {
		//this.infoText = "A trivial policy has been generated.";
		let policy = trivialPolicy(this.graph);
		policyView = new LinearPolicyView(graph, div, policy);
	}
	div.html("");
	div.append("p")
		.text(`You can either request a solution from the server, or
				synthesize a trivial solution on the client-side for testing`);
	div.append("div").classed("blockButton", true)
		.text("Request Policy From Server")
		.on("click", requestPolicy);
	div.append("div").classed("blockButton", true)
		.text("Synthesize Trivial Policy")
		.on("click", createTrivialPolicy);
}

/**
 * Best case
 */
class LinearPolicyView {
	/**
	 * Takes a graph and div.
	 * div must be a d3 selection
	 */
	constructor(_graph, div, policy) {
		this.div = div;
		this.graph = _graph;
		this.setPolicy(policy);
	}
	setPolicy(policy) {
		this.policy = policy;
		this.createMarkerLayer();
		this.policyNavigator();
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
					icon: getNumberIcon(i),
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



class InteractivePolicyView {
	/**
	 * Takes a graph and div.
	 * div must be a d3 selection
	 */
	constructor(_graph, div, policy) {
		this.div = div;
		this.graph = _graph;
		this.policy = policy;
		this.policyNavigator();
	}
	createMarkerLayer() {
		// remove the old on if any
		if(this.markerLayer) this.markerLayer.remove();
		if(this.policy.nextNodes == null) return;
		this.markers = this.policy.nextNodes.map(node => {
			node.status = 1; // assume successful
			let m = L.marker(node.latlng, {
				icon: ActivateIcon,
				pane: "resources",
			});
			m.on("click", () => {
				node.status *= -1;
				this.graph.rerender();
			});
			return m;
		});
		this.markerLayer = L.layerGroup(this.markers);
		this.markerLayer.addTo(Map);
		this.graph.rerender(); // we changed statuses of nodes
	}
	policyNavigator() {
		this.createMarkerLayer();
		this.div.html("");
		let buttonDiv = this.div.append("div").classed("policyControls", true);
		let prev = buttonDiv.append("div").classed("blockButton", true)
			.text("Previous Step");
		let next = buttonDiv.append("div").classed("blockButton", true)
			.text("Next Step");
		if(this.policy.previousStates.length>0) {
			prev.on("click", () => {
				this.policy.previousState();
				this.policyNavigator(); // refresh
			});
		} else {
			prev.classed("disabled", true);
		}
		if(this.policy.nextStateAvailable()) {
			next.on("click", () => {
				this.policy.nextState();
				this.policyNavigator(); // refresh
			});
			this.div.append("p").text("You need to activate the following nodes:");
			let ul = this.div.append("ul");
			ul.selectAll("li").data(this.policy.nextNodes).join("li")
				.text(d => "Node #"+d.index);
			/*
			let p = this.policy.successProbability(this.policy.index+1);
			this.div.append("p").text("Success Probability for next step: "+
				p.toFixed(3));
			*/
		} else {
			next.classed("disabled", true);
			this.div.append("p")
				.text("No more actions are available.");
		}
		// lists policy steps
		// TODO
		/*
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
		*/
	}
	destroy() {
		if(this.markerLayer) this.markerLayer.remove();
	}
}
