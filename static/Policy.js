
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
	constructor(_graph, policy, initialize=true) {
		this.graph = graph;
		for(let key in policy) {
			this[key] = policy[key];
		}
		if(initialize) {
			this.end = false; // if true (No more actions available)
			this.previousStates = [];
			this.setState(0);
		}
	}
	setAction(actionNum, next) {
		this.actionNum = actionNum;
		this.action = this.actions[actionNum];
		if(this.action) {
			this.end = this.action.length == 1 && this.action[0][0]-1 == this.state;
		} else {
			this.end = true;
		}
		// set graph to the next state
		if(next === null || this.end) {
			let hist = this.previousStates.map(s => this.states[s.state]);
			hist.push(this.states[this.state]);
			if(this.end) hist.push(this.states[this.state]);
			this.graph.setState(hist);
		}
		else this.setNext(next);
	}
	setState(state, next = 0) {
		this.state = state;
		this.actions = this.transitions[this.state];
		let nextAction = this.policy[this.state];
		this.setAction(nextAction, next);
	}
	setStateAndAction(state, action, next = 0) {
		this.state = state;
		this.actions = this.transitions[this.state];
		this.setAction(action, next);
	}
	setNext(i) {
		// represents which transition to take in the current action
		this.next = i;
		let nextState = this.states[this.action[this.next][0] - 1];
		let hist = this.previousStates.map(s => this.states[s.state]);
		hist.push(this.states[this.state]);
		hist.push(nextState);
		this.graph.setState(hist);
	}
	getCurrentState() {
		return this.states[this.state];
	}
	getNextState() {
		return this.states[this.action[this.next][0] - 1];
	}
	describeAction(actionNum = null) {
		if(actionNum == null) actionNum =this.actionNum;
		let output =  "Action #"+actionNum;
		if(actionNum == this.policy[this.state]) {
			output += " (Policy)";
		}
		return output;
	}
	describeTransition(action, i) {
		let nextState = this.states[action[0] - 1];
		let currentState = this.states[this.state];
		let list = "";
		for(let i = 0; i < currentState.length; ++i) {
			if(nextState[i] != currentState[i]) {
				list += `<div>Node #${i}: ${nextState[i]}</div>`;
			}
		}
		//return `<div><b>Transition #${i}</b> <br/>`+this.states[action[0] - 1].toString()+"</div>";
		return `
			<div><b>Transition #${i}</b> <div>${list}</div> </div>
			<div class="rightFlexFloat">P = ${action[1].toFixed(3)}</div>
			`;
	}
	nextState() {
		this.previousStates.push({
			state: this.state,
			actionNum: this.actionNum,
			next: this.next,
		});
		this.setState(this.action[this.next][0] - 1);
	}
	previousState() {
		let prev = this.previousStates.pop();
		if(prev === undefined) throw new Error("There's no previous state");
		this.setStateAndAction(prev.state, prev.actionNum, prev.next);
	}
	nextStateAvailable() {
		return !this.end;
	}

	/**
	 * Calculates the energization probability of all nodes
	 * recursive solution
	 */
	_allEnergizationProb(state) {
		let vec = this.states[state].map(s => {
			if(s === "D") return 0;
			if(s !== "U") return 1;
			return null;
		});
		let actions = this.transitions[state];
		let action = actions[this.policy[state]];
		if(!action) return vec.map(s => s==null ? 0 : s);
		if(action.length == 1 && action[0][0]-1 == state)
			return vec.map(s => s==null ? 0 : s);
		return action.map(a => {
			if(a[0]-1 == state) vec.map(() => 0);
			let mul = vec.map(s => s==null ? a[1] : a[1]*s);
			return this._allEnergizationProb(a[0]-1).map((p,i) => p * mul[i]);
		}).reduce((a,b) => a.map((n,i) => n+b[i]), vec.map(() => 0));
	}
	allEnergizationProb() {
		return this._allEnergizationProb(this.state);
	}
	cumulativePfs() {
		return this.allEnergizationProb().map(a => 1-a);
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
		console.log(status);
		return status != "D" && status != "U";
	}
	energizationProbabilities(nodeIndex) {
		return this._energizationProbabilities(this.state, nodeIndex);
	}
	energizationProbability(nodeIndex, depth) {
		return this._energizationProbability(this.state, nodeIndex, depth);
	}
	update(policy, next = 0) {
		Object.assign(this, policy);
		this.setAction(this.policy[this.state], next);
	}
}

function loadPolicy(div, graph, policy, options={}) {
	options.prelude = d => {
		let ul = d.append("ul");
		if(options.prioritized) {
			ul.append("li").text("Prioritized nodes: ")
			.append("ul").selectAll("li").data(options.prioritized).join("li")
				.text((p,i) => 
					"Class "+(i+1)+": "+
					p.map(i => getNodeName(graph.nodes[i])).join(", ")
				);
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

function requestPolicy(graph, settings) {
	let request = {
		graph: graph.serialize(),
	};
	Object.assign(request, settings);
	return Network.post("/policy", JSON.stringify(request));
}

function requestNewPolicy(div, graph, settings={}) {
	console.log("requesting new policy...");
	div.html("");
	addSpinnerDiv(div).append("p").text("Waiting response from server...");
	requestPolicy(graph, settings).then(response => {
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
	div.html("");
	addSpinnerDiv(div).append("p").text("Please wait...");
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
		{ name: "Custom MaxMin", value: "custom_maxmin" },
		{ name: "Custom MinMin", value: "custom_minmin" },
		{ name: "Greedy", value: "greedy" },
		{ name: "Average", value: "average" },
	];
	let selectedAlgo = algorithms.length - 1;
	let algoDiv = div.append("div");
	let algoDivs = algoDiv.selectAll("div").data(algorithms).join("div")
		.classed("customCheckbox", true)
		.classed("radio", true);
	algoDivs.append("input")
		.attr("type", "radio")
		.attr("name", "algos")
		.attr("id", d => "algo-"+d.value)
		.attr("checked", (_,i) => i == selectedAlgo)
		.on("change", (_, i) => selectedAlgo = i);
	algoDivs.append("label")
		.text(d => "Use "+d.name)
		.attr("for", d => "algo-"+d.value);
	// ids of the prioritized node
	let priorities = {};
	let li;
	let updateList = () => {
		li.attr("class", (_, i) => {
			if(priorities[i] > 0) return "currentIndex";
			else return "";
		})
		.html((_, i) => {
			let name = "Node #"+i;
			if(priorities[i] > 0) name = "<b>["+priorities[i]+"]</b> "+name
			return name;
		})
	};
	let markers = null;
	let markerLayer = null;
	let createMarkers = () => {
		if(markerLayer) markerLayer.remove();
		markers = graph.nodes.map((node, i) => {
			let pri = priorities[i];
			let m = L.marker(node.latlng, {
				icon: getDescriptionIcon(
					"#"+i+" "+(pri > 0 ? "Prioritized <b>["+pri+"]</b>" : "Normal"),
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
		if(i in priorities) {
			let count = Object.values(priorities)
				.filter(p => p === priorities[i]).length;
			if(count > 1) {
				++priorities[i];
			} else {
				delete priorities[i];
			}
		} else {
			priorities[i] = 1;
		}
		console.log(priorities);
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
			let prioritized = [];
			for(let node in priorities) {
				let p = priorities[node] - 1;
				if(!prioritized[p]) prioritized[p] = [];
				prioritized[p].push(node);
			}
			console.log("Prioritized:",prioritized);
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
	graph.emptyState();
	graph.rerender();

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
		this.options = options;
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
			// select box for action
			var innerDiv;
			const wrapperDiv = this.div.append("div")
				.style("margin", "1em")
				.attr("class","CustomSelect");
			wrapperDiv.append("div")
				.attr("class", "CustomSelectHead")
				.text(this.policy.describeAction())
				.on("click", function(_) {
					innerDiv.classList.toggle("open");
				}).node();
			const ul = wrapperDiv.append("div").attr("class", "CustomSelectList").append("div");
			innerDiv = ul.node();

			ul.selectAll("div")
				.data(Object.keys(this.policy.actions)).join("div")
				.attr("class", "CustomSelectElement")
				.text((i) => this.policy.describeAction(i))
				.on("click", (i) => {
					this.policy.setAction(i, 0);
					this.policyNavigator();
				});

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
				.html(this.policy.describeTransition.bind(this.policy))
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
	updateMode() {
		if(this.markerLayer) this.markerLayer.remove();
		this.div.html("");
		this.div.append("h3").text("Updating Graph");
		let div = this.div.append("div");
		div.append("p").text("You are updating the graph right now.");
		div.append("p").text(`
			When you finish updating, click "Done" button to
			update the policy.`);
		div.append("div").classed("blockButton", true)
			.text("Done")
			.on("click", () => {
				div.html("");
				addSpinnerDiv(div).append("p")
					.text("Waiting response from server...");
				requestPolicy(this.graph, this.options).then(response => {
					let policy = JSON.parse(response);
					this.policy.update(policy);
					this.policyNavigator();
				}).catch(error => {
					div.html("");
					div.selectAll("p").remove();
					div.append("b").style("color", "red")
						.text("Failed to get updated policy");
					div.append("p").style("color", "red")
						.text(error);
					div.append("div").classed("blockButton", true)
						.text("Go back")
						.on("click", this.updateMode.bind(this));
				});
			});
		div.append("div").classed("blockButton", true)
			.text("Cancel")
			.on("click", () => {
				this.graph.cancelUpdate();
				this.policyNavigator();
			});
	}
	nodeOnInfo(node, div) {
		if(node.status > 0) return;
		let p = this.policy.energizationProbabilities(node.index);
		let index = p.lastIndexOf(0);
		p = p.slice(index, p.indexOf(p[p.length-1])+1);
		div = d3.select(div);
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
