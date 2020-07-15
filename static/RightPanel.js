
var policyView = null;

function selectGraph(choices) {
	let content = d3.select("#RightPanelContent").html("");
	let header = content.append("h1").text("1. Load Graph");
	let body = content.append("div");
	body.append("p").text("Select a graph to load: ");
	body.selectAll("div").data(choices).join("div")
		.classed("blockButton", true)
		.text(d => d.name)
		.on("click", d => {
			d.load();
			header.classed("disabled", true);
			body.html("");
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
		this.div.html("")
			.append("div").classed("blockButton", true)
			.text("Basic Policy")
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
		let prev = this.div.append("div").classed("blockButton", true)
			.text("Previous Step");
		let next = this.div.append("div").classed("blockButton", true)
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
		let list = this.div.append("div");
		list.selectAll("div").data(this.policy).join("div")
			.text(d => {
				if(d==null) return "Initial Status";
				else return "Activate Node #"+d;
			})
			.attr("class", (d, i) => {
				if(i > this.policyIndex) return "disabled";
				else if(i == this.policyIndex) return "currentIndex";
				else return "";
			});
	}
}
