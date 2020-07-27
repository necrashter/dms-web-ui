
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

function getDescriptionIcon(str, neg=false) {
	let width = str.toString().length*6+40;
	let classname = "descMarker";
	if(neg) classname += " neg";
	return L.divIcon({
		className: 'divIcon',
		html: `<div class='${classname}'>${str}</div>`,
		iconSize: [width,50],
		iconAnchor: [width/2,0]
	});
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
	setState(state, next = 0) {
		this.state = state;
		this.actions = this.transitions[this.state];
		this.action = this.actions[this.policy[this.state]];
		if(this.action.length == 1 && this.action[0][0]-1 == this.state) {
			this.end = true;
		} else {
			this.end = false;
		}
		// set graph to the next state
		this.setNext(next);
	}
	setNext(i) {
		// represents which transition to take in the current action
		this.next = i;
		let nextState = this.states[this.action[this.next][0] - 1];
		this.graph.setState(nextState);
	}
	getCurrentState() {
		return this.states[this.state];
	}
	getNextState() {
		return this.states[this.action[this.next][0] - 1];
	}
	describeAction(action, i) {
		let nextState = this.states[action[0] - 1];
		let currentState = this.states[this.state];
		let list = "";
		for(let i = 0; i < currentState.length; ++i) {
			if(nextState[i] != currentState[i]) {
				list += `<div>Node #${i}: ${nextState[i]}</div>`;
			}
		}
		//return `<div><b>Transition #${i}</b> <br/>`+this.states[action[0] - 1].toString()+"</div>";
		return `<div><b>Transition #${i}</b> <div>${list}</div> </div>`;
	}
	nextState() {
		this.previousStates.push({
			state: this.state,
			next: this.next,
		});
		this.setState(this.action[this.next][0] - 1);
	}
	previousState() {
		let prev = this.previousStates.pop();
		if(prev === undefined) throw new Error("There's no previous state");
		this.setState(prev.state, prev.next);
	}
	nextStateAvailable() {
		return !this.end;
	}
}

/**
 * best case steps for linear
 */
function getStepsFromPolicy(policy) {
	let current = 0;
	let currentState = policy.states[current];
	let states = [currentState];
	while(current < policy.states.length){
		let actions = policy.transitions[current];
		let action = actions[policy.policy[current]];
		let next = action[0][0] - 1;
		if(next == current) break;
		let nextState = policy.states[next];
		if(!nextState) break;
		states.push(nextState);
		current = next;
		currentState = nextState;
	}
	console.log(states);
	return states;
}

function selectPolicyView(div, graph) {
	function loadPolicy(policy) {
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
	}
	function requestFreshPolicy() {
		console.log("requesting new policy...");
		div.html("Waiting response from server...");
		let json = graph.getJson();
		Network.post("/policy", json).then(response => {
			let policy = JSON.parse(response);
			loadPolicy(policy);
		})
		.catch(error => {
			div.html("");
			div.append("b").text("Failed to get policy")
				.style("color","red");
			div.append("p").text(error)
				.style("color","red");
			div.append("div").classed("blockButton", true)
				.text("Go Back")
				.on("click", () => selectPolicyView(div, graph));
		});
	}
	function getPolicy() {
		div.html("Please Wait...");
		if(graph.solutionFile && !graph.dirty) {
			Network.get(graph.solutionFile).then(response => {
				console.log("Fetched premade policy:",graph.solutionFile);
				loadPolicy(JSON.parse(response));
			}).catch(error => {
				console.error("Error while getting premade policy",
					graph.solutionFile,":",error);
				requestFreshPolicy();
			});
		} else {
			requestFreshPolicy();
		}
	}
	function createTrivialPolicy() {
		//this.infoText = "A trivial policy has been generated.";
		let policy = trivialPolicy(graph);
		policyView = new TrivialPolicyView(graph, div, policy);
	}
	div.html("");
	div.append("p")
		.text(`You can either request a solution from the server, or
				synthesize a trivial solution on the client-side for testing`);
	div.append("div").classed("blockButton", true)
		.text("Request Policy From Server")
		.on("click", getPolicy);
	div.append("div").classed("blockButton", true)
		.text("Synthesize Trivial Policy")
		.on("click", createTrivialPolicy);
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
	setNext(i) {
		this.policy.setNext(i);
		this.createMarkerLayer();
		//this.policyNavigator();
	}
	createMarkerLayer() {
		// remove the old one if any
		if(this.markerLayer) this.markerLayer.remove();
		if(this.policy.end) return;
		let currentState = this.policy.getCurrentState();
		let nextState = this.policy.getNextState();
		this.markers = [];
		for(let i=0; i<currentState.length; ++i) {
			if(currentState[i] != nextState[i]) {
				let node = this.graph.nodes[i];
				let desc = nextState[i];
				let m = L.marker(node.latlng, {
					icon: getDescriptionIcon("#"+i+" "+desc, node.status < 0),
					pane: "resources",
				});
				this.markers.push(m);
			}
		}
		this.markerLayer = L.layerGroup(this.markers);
		this.markerLayer.addTo(Map);
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
			this.div.append("p").text("The following transitions are possible:");
			let transitionList = this.div.append("div")
				.classed("selectList", true)
				.classed("wide", true);
			let updateLi = (li) => {
				li.attr("class", (_, i) => {
					if(i == this.policy.next) return "selected";
					else return "";
				})
			}
			let li = transitionList.selectAll("div").data(this.policy.action).join("div")
				.html(this.policy.describeAction.bind(this.policy))
				.on("click", (_, i) => {
					this.setNext(i);
					updateLi(li);
				});
			updateLi(li);
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
