
/**
 * best case steps for linear
 */
function getStepsFromPolicy(policy) {
	let current = 0;
	let states = [current];
	while(current < policy.states.length){
		let actions = policy.transitions[current];
		let action = actions[policy.policy[current]];
		let next = action[0][0] - 1;
		if(next == current) break;
		let nextState = policy.states[next];
		if(!nextState) break;
		states.push(next);
		current = next;
		currentState = nextState;
	}
	return states;
}


class LinearPolicy extends InteractivePolicy {
	constructor(_graph, policy) {
		super(_graph, policy);
		this.steps = getStepsFromPolicy(policy);
		this.goTo(0);
	}
	goTo(index) {
		this.index = index;
		this.setState(this.steps[this.index], null); //no next
	}
	getActivationList() {
		let lastStep = this.states[this.steps[0]];
		let output = [null];
		for(let i = 1; i<this.steps.length; ++i) {
			let step = this.states[this.steps[i]];
			let energizedNodes = [];
			for(let j = 0; j<step.length; ++j) {
				if(lastStep[j] === "U" && step[j] !== "U") {
					energizedNodes.push(this.graph.nodes[j]);
				}
			}
			output.push(energizedNodes);
			lastStep = step;
		}
		return output;
	}
	/**
	 * Calculates the probability of failure of the specified step, relative
	 * to current step.
	 */
	successProbability(index) {
		let p = 1;
		let step = this.states[this.steps[index]];
		for(let i=0; i<step.length; ++i) {
			let status = step[i];
			let node = this.graph.nodes[i];
			if((status !== "D" && status !== "U") && node.status == 0) {
				p *= (1-node.pf);
			}
		}
		return p;
	}
	getName(d, i) {
		if(i == 0) return "Initial Status";
		else {
			let old = this.states[this.steps[i-1]];
			d = this.states[d];
			let nodes = [];
			for(let i =0; i<d.length; ++i) {
				if(old[i] !== d[i]) nodes.push("#"+i);
			}
			return "Activate Nodes "+
				(nodes.join(", "));
		}
	}
}

class LinearPolicyView {
	/**
	 * Takes a graph and div.
	 * div must be a d3 selection
	 */
	constructor(_graph, div, policy, options={}) {
		this.div = div;
		this.graph = _graph;
		Object.assign(this, options);
		this.setPolicy(policy);
	}
	setPolicy(policy) {
		this.policy = policy;
		this.createMarkerLayer();
		this.policyNavigator();
	}
	goToPolicyStep(index) {
		this.policy.goTo(index);
		//this.graph.rerender();
		this.policyNavigator();
	}
	createMarkerLayer() {
		this.markers = [];
		let activationList = this.policy.getActivationList();
		for(let i=1; i<activationList.length; ++i) {
			let nodes = activationList[i];
			let icon = getNumberIcon(i);
			nodes.forEach(node => {
				let m = L.marker(node.latlng, {
					icon: icon,
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
		if(this.description) this.div.append("p").text(this.description);
		// deprecated?
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
			.text(this.policy.getName.bind(this.policy))
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
	nodeOnInfo(node, div) {
		let p = this.policy.energizationProbabilities(node.index);
		let index = p.lastIndexOf(0);
		if(index < 0) return;
		p = p.slice(index);
		div = d3.select(div);
		div.append("div").text("Probability of energization in...");
		div.append("ul").selectAll("li").data(p).join("li")
			.text((d,i) => `${i==p.length-1 ? (index+i)+"+" : i+index} steps: `+(Math.round(10000*d)/10000));
	}
	destroy() {
		if(this.markerLayer) this.markerLayer.remove();
	}
}

