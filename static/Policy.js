
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
		if(this.action) {
			this.end = this.action.length == 1 && this.action[0][0]-1 == this.state;
		} else {
			this.end = true;
		}
		// set graph to the next state
		if(next === null || this.end)
			this.graph.setState(this.states[this.state]);
		else this.setNext(next);
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

	/**
	 * Calculates the energization probability of the node at nodeIndex
	 * in "depth" number of steps
	 * recursive solution
	 */
	_energizationProbability(state, nodeIndex, depth) {
		let s = this.states[state][nodeIndex]; //current state of the node
		console.log(state)
		if(depth==0) {
			return (s === "D" || s === "U") ? 0 : 1;
		}
		if(s === "D") return 0;
		if(s !== "U") return 1;
		let actions = this.transitions[state];
		let action = actions[this.policy[state]];
		if(!action) return 0;
		if(action.length == 1 && action[0][0]-1 == state) return 0;
		return action.map(a => {
			if(a[0]-1 == state) return 0;
			return a[1]*this._energizationProbability(a[0]-1, nodeIndex, depth-1);
		}).reduce((a,b) => a+b, 0);
	}
	/**
	 * Calculates the energization probability of the node at nodeIndex
	 * iterative solution to calculate all steps
	 */
	_energizationProbabilities(state0, nodeIndex) {
		let queue = [{
			state: state0,
			p: 1,
			depth: 0,
		}];
		let results = [0];
		while(queue.length > 0) {
			let {state, p, depth} = queue.shift(); //fifo
			if(typeof results[depth] === "undefined")
				results[depth] = results[depth-1];
			let s = this.states[state][nodeIndex]; //current state of the node
			if(s === "D") continue; // nothing to see
			if(s !== "U") results[depth] += p; //energized
			else {
				// energized
				let actions = this.transitions[state];
				let action = actions[this.policy[state]];
				if(!action) continue;
				for(let a of action) {
					if(a[0]-1 == state) continue;
					queue.push({
						state: a[0]-1,
						p: p*a[1],
						depth: depth+1,
					});
				}
			} //end else
		} // end while
		return results;
	}
	isEnergized(nodeIndex) {
		let status = this.states[this.state][nodeIndex];
		return status != "D" && status != "U";
	}
	energizationProbabilities(nodeIndex) {
		return this._energizationProbabilities(this.state, nodeIndex);
	}
	energizationProbability(nodeIndex, depth) {
		return this._energizationProbability(this.state, nodeIndex, depth);
	}
}

function loadPolicy(div, graph, policy, options={}) {
	// First make every bus "Unknown"
	graph.nodes.forEach(node => {
		node.status = 0;
	});
	graph.rerender();

	options.prelude = d => {
		let ul = d.append("ul");
		if(options.prioritized) {
			ul.append("li").text("Prioritized nodes: " + options.prioritized);
			ul.append("li").text("Prioritization Algorithm: " + options.algo);
		} else {
			ul.append("li").text("No prioritization");
		}
		let horizon = "Default";
		if(options.conf) horizon = options.conf.horizon;
		ul.append("li").text("Horizon: "+horizon);
	}
	div.html("");
	div.append("h3").text("Select Mode");
	div.append("p").text(`Interactive Mode allows you to select the
				result of each step as you run the policy.`);
	div.append("div").classed("blockButton", true)
		.text("Interactive Mode")
		.on("click", () => {
			policyView = new InteractivePolicyView(graph, div,
				new InteractivePolicy(graph, policy), options);
		});
	div.append("p").text(`In linear mode you will see the best case,
				where the activation of every bus is successful.`);
	div.append("div").classed("blockButton", true)
		.text("Linear Mode")
		.on("click", () => {
			policyView = new LinearPolicyView(graph, div,
				new LinearPolicy(graph, policy), options);
		});
}
function requestNewPolicy(div, graph, settings={}) {
	console.log("requesting new policy...");
	div.html("Waiting response from server...");
	let request = {
		graph: graph.serialize(),
	};
	Object.assign(request, settings);
	Network.post("/policy", JSON.stringify(request)).then(response => {
		let policy = JSON.parse(response);
		loadPolicy(div, graph, policy, settings);
	}).catch(error => {
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
/**
 * Gets the premade policy from server if available,
 * otherwise requests new policy
 */
function getPolicy(div, graph) {
	div.html("Please Wait...");
	if(graph.solutionFile && !graph.dirty) {
		// force get new version
		let url = graph.solutionFile + "?time="+ Date.now();
		Network.get(url).then(response => {
			console.log("Fetched premade policy:",graph.solutionFile);
			loadPolicy(div, graph, JSON.parse(response));
		}).catch(error => {
			console.error("Error while getting premade policy",
				graph.solutionFile,":",error);
			requestNewPolicy(div, graph);
		});
	} else {
		requestNewPolicy(div, graph);
	}
}

function selectPrioritizedNode(div, graph){
	div.html("");
	div.style("opacity", 0).transition().duration(500).style("opacity", 1);
	let horizon = createTextInput(div, "Horizon", 10);
	let errorDiv = div.append("p").text("")
		.style("color", "red");
	let algorithms = [
		{ name: "S3P", value: "s3p" },
		{ name: "Cost Modification", value: "costmod" },
	];
	let selectedAlgo = 0;
	let algoDiv = div.append("div");
	let algoDivs = algoDiv.selectAll("div").data(algorithms).join("div")
		.classed("customCheckbox", true)
		.classed("radio", true);
	algoDivs.append("input")
		.attr("type", "radio")
		.attr("name", "algos")
		.attr("id", d => "algo-"+d.value)
		.on("change", (_, i) => selectedAlgo = i);
	algoDivs.append("label")
		.text(d => "Use "+d.name)
		.attr("for", d => "algo-"+d.value);
	// ids of the prioritized node
	let prioritized = [];
	let li;
	let updateList = () => {
		li.attr("class", (_, i) => {
			if(prioritized.includes(i)) return "currentIndex";
			else return "";
		})
	};
	let markers = null;
	let markerLayer = null;
	let createMarkers = () => {
		if(markerLayer) markerLayer.remove();
		markers = graph.nodes.map((node, i) => {
			let pri = prioritized.includes(i);
			let m = L.marker(node.latlng, {
				icon: getDescriptionIcon(
					"#"+i+" "+(pri ? "Prioritized" : "Normal"),
					pri),
				pane: "resources",
			});
			m.on("click", () => selectFun(node, i));
			return m;
		});
		markerLayer = L.layerGroup(markers);
		markerLayer.addTo(Map);
	};
	let selectFun = (_, i) => {
		if(prioritized.includes(i)) {
			prioritized.splice(prioritized.indexOf(i),1);
		} else {
			prioritized.push(i);
		}
		updateList();
		createMarkers();
	};
	let list = div.append("div")
		.classed("selectList", true);
	li = list.selectAll("div").data(graph.nodes).join("div")
		.text((_, i) => "Node #"+i)
		.on("click", selectFun)
	/*
		.on("mouseover", (_, i) => {
			let icon = markers[i]._icon;
			if(icon) icon.children[0].classList.add("hover");
		})
		.on("mouseout", (_, i) => {
			let icon = markers[i]._icon;
			if(icon) icon.children[0].classList.remove("hover");
		});
		*/
	updateList();
	createMarkers();
	cleanUp = () => {
		if(markerLayer) markerLayer.remove();
	}
	div.append("p").text(`Info`);
	div.append("div").classed("blockButton", true)
		.text("Generate Policy")
		.on("click", () => {
			horizonValue = parseInt(horizon.property("value"));
			if(isNaN(horizonValue)) {
				errorDiv.text("Invalid horizon");
				return;
			}
			cleanUp();
			requestNewPolicy(div, graph, {
				prioritized: prioritized,
				algo: algorithms[selectedAlgo].value,
				conf: {
					horizon: horizonValue,
				}
			});
		});
}

function selectPolicyOptions(div, graph){
	div.html("");
	div.style("opacity", 0).transition().duration(500).style("opacity", 1);
	let horizon = createTextInput(div, "Horizon", 10);
	let shortSighted = false;
	createCheckbox(div, "Short-sighted", val => {
		shortSighted = val;
	});
	let errorDiv = div.append("p").text("")
		.style("color", "red");
	div.append("div").classed("blockButton", true)
		.text("Generate Policy")
		.on("click", () => {
			horizonValue = parseInt(horizon.property("value"));
			if(isNaN(horizonValue)) {
				errorDiv.text("Invalid horizon");
				return;
			}
			requestNewPolicy(div, graph, {
				conf: {
					horizon: horizonValue,
				},
				shortsighted: shortSighted,
			});
		});
}

function selectPolicyView(div, graph) {
	function createTrivialPolicy() {
		//this.infoText = "A trivial policy has been generated.";
		let policy = trivialPolicy(graph);
		policyView = new TrivialPolicyView(graph, div, policy);
	}
	div.html("");
	div.append("div").classed("blockButton", true)
		.text("No Prioritization")
		.on("click", () => {
			selectPolicyOptions(div, graph);
		});
	div.append("div").classed("blockButton", true)
		.text("Prioritize")
		.on("click", () => {
			selectPrioritizedNode(div, graph);
		});
	div.append("p")
		.text(`Deprecated buttons`);
	div.append("div").classed("blockButton", true)
		.text("Request Policy From Server")
		.on("click", () => getPolicy(div, graph));
	div.append("div").classed("blockButton", true)
		.text("Synthesize Trivial Policy")
		.on("click", createTrivialPolicy);
}



class InteractivePolicyView {
	/**
	 * Takes a graph and div.
	 * div must be a d3 selection
	 */
	constructor(_graph, div, policy, options={}) {
		this.div = div;
		this.graph = _graph;
		this.policy = policy;
		Object.assign(this, options);
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
		if(this.prelude) this.prelude(this.div);
		if(this.policy.duration) {
			this.div.append("p")
				.text("Elapsed time: "+this.policy.duration);
		}
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
			let li = transitionList.selectAll("div")
				.data(this.policy.action).join("div")
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
	}
	nodeOnInfo(node, div) {
		if(this.policy.isEnergized(node)) return;
		div = d3.select(div);
		let p = this.policy.energizationProbabilities(node.index);
		let index = p.lastIndexOf(0);
		p = p.slice(index, p.indexOf(p[p.length-1])+1);
		div.append("div").text("Probability of energization in...");
		div.append("ul").selectAll("li").data(p).join("li")
			.text((d,i) => `${i==p.length-1 ? (index+i)+"+" : i+index} steps: `+(Math.round(10000*d)/10000));
	}
	destroy() {
		if(this.markerLayer) this.markerLayer.remove();
	}
}

function removePolicy() {
	if(cleanUp) cleanUp();
	if(policyView && policyView.destroy) policyView.destroy();
	policyView = null;
}
