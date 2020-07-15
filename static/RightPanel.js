
var policyView = null;

function selectGraph(choices, prebody=null) {
	let content = d3.select("#RightPanelContent").html("");
	let header = content.append("h1").text("1. Load Graph");
	let body = content.append("div").style("overflow", "hidden");
	if(prebody) body.call(prebody);
	body.append("p").text("Select a graph to load: ");
	let list = body.append("div").classed("selectList", true);
	list.selectAll("div").data(choices).join("div")
		//.classed("blockButton", true)
		.text(d => d.name)
		.on("click", d => {
			d.load();
			header.classed("disabled", true);
			body.transition().duration(600).style("height", "0")
				.on("end", () => body.html(""));
			content.append("h1").text("2. Synthesize Policy");
			policyView = new PolicyView(graph, content.append("div"));
		});
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
		this.graph.nodes.forEach((node, i) => {
			if(node.status == 0) this.policy.push(i);
		});
		this.policyIndex = 0;
		this.infoText = "A trivial policy has been generated.";
		this.policyNavigator();
	}
	goToPolicyStep(index) {
		this.policyIndex = index;
		this.graph.nodes.forEach( (node, i) => {
			// stands for node policy index
			let npi = this.policy.indexOf(i);
			if(npi >= 0) {
				if(npi <= index) {
					node.status = 1;
				} else {
					node.status = 0;
				}
			}
		});
		this.graph.rerender();
		this.policyNavigator();
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
		} else {
			next.classed("disabled", true);
		}
		// lists policy steps
		let stepList = this.div.append("div").classed("selectList", true);
		stepList.selectAll("div").data(this.policy).join("div")
			.text(d => {
				if(d==null) return "Initial Status";
				else return "Activate Node #"+d;
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
			this.div.append("h2").text("Congratulations!");
			this.div.append("p")
				.text("You have reached the end of the policy.");
		}
	}
}
