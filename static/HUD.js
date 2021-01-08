const BottomRightPanel = document.getElementById("BottomRightPanel");
const BottomRightPanelContent = BottomRightPanel.querySelector(".content");

const Styles = [
	{ name: "CyberPunk", folder: "cyberpunk-style" },
	{ name: "Lab Dark", folder: "lab-dark-style" },
	{ name: "Lab", folder: "lab-style" },
	{ name: "Medieval", folder: "medieval-style" },
];

function changeStyle(folderName) {
	document.getElementById("index-css").href = folderName+"/index.css";
	document.getElementById("graph-css").href = folderName+"/graph.css";
	document.getElementById("custom-select-css").href= folderName+"/CustomSelect.css";
	document.getElementById("custom-checkbox-css").href = folderName+"/CustomCheckbox.css";
	// document.getElementById("spinner-css").href = folderName+"/Spinner.css";
}


BottomRightPanel.show = function(info=null) {
	BottomRightPanel.contentInfo = info;
	BottomRightPanel.classList.remove("hidden");
}

BottomRightPanel.hide = function() {
	BottomRightPanel.contentInfo = null;
	BottomRightPanel.classList.add("hidden");
	if(graph) graph.onPanelHide();
}

function createTextInput(target, name, value) {
	let div = target.append("div");
	div.append("label").attr("for", name).text(name+":");
	let input = div.append("input").attr("type", "text").property("value", value);
	return input;
}

function createSelectBox(target, data, name, value) {
	let info = {value: value};
	let currentName = data.find(d => d.value == value).name;
	let div = target.append("div").style("display", 'flex');
	div.append("label").text(name+":");
	var innerDiv;
	const wrapperDiv = div.append("div")
		.attr("class","CustomSelect")
		.style("flex-grow", 1);
	var headDiv = wrapperDiv.append("div")
		.attr("class", "CustomSelectHead")
		.text(currentName)
		.on("click", function() {
			innerDiv.classList.toggle("open");
		}).node();
	const ul = wrapperDiv.append("div").attr("class", "CustomSelectList")
		.append("div");
	innerDiv = ul.node();

	ul.selectAll("div").data(data).join("div")
		.attr("class", "CustomSelectElement")
		.text(d => d.name)
		.on("click", d => {
			info.value = d.value;
			headDiv.innerText=d.name;
			innerDiv.classList.remove("open");
		});
	return info;
}

function createCustomSelectBox(div, data, currentIndex=0, zIndex=1) {
	let current = data[currentIndex];
	var innerDiv;
	const wrapperDiv = div.append("div")
		.attr("class","CustomSelect")
		.style("flex-grow", 1)
		.style("z-index", zIndex);
	var headDiv = wrapperDiv.append("div")
		.attr("class", "CustomSelectHead")
		.html(current.name)
		.on("click", function() {
			innerDiv.classList.toggle("open");
		}).node();
	const ul = wrapperDiv.append("div").attr("class", "CustomSelectList")
		.append("div");
	innerDiv = ul.node();

	ul.selectAll("div").data(data).join("div")
		.attr("class", "CustomSelectElement")
		.html(d => d.name)
		.on("click", d => {
			d.func();
			headDiv.innerHTML=d.name;
			innerDiv.classList.remove("open");
		});
}

function createCheckbox(target, label, onChange) {
	let id = label.toLowerCase().replace(/\s+/g , "-");
	let div = target.append("div").classed("customCheckbox", true);
	let checkbox = div.append("input")
		.attr("id", id)
		.attr("type", "checkbox")
		.on("change", () => {
			onChange(checkbox.node().checked);
		});
	//checkbox.node().checked = Settings.animateAnts;
	div.append("label")
		.attr("for", id)
		.text(label);
	return div;
}

function addSpinnerDiv(div) {
	let out = div.append("div").classed("spinnerWrapper", true);
	out.append("div").classed("spinner", true);
	return out;
}



function AdvancedCopy(theText){
     //create our hidden div element
     var hiddenCopy = document.createElement('div');
     //set the innerHTML of the div
     hiddenCopy.innerText = theText;
     //set the position to be absolute and off the screen
     hiddenCopy.style.position = 'absolute';
     hiddenCopy.style.left = '-9999px';
 
     //check and see if the user had a text selection range
     var currentRange;
     if(document.getSelection().rangeCount > 0)
     {
          //the user has a text selection range, store it
          currentRange = document.getSelection().getRangeAt(0);
          //remove the current selection
          window.getSelection().removeRange(currentRange);
     }
     else
     {
          //they didn't have anything selected
          currentRange = false;
     }
 
     //append the div to the body
     document.body.appendChild(hiddenCopy);
     //create a selection range
     var CopyRange = document.createRange();
     //set the copy range to be the hidden div
     CopyRange.selectNode(hiddenCopy);
     //add the copy range
     window.getSelection().addRange(CopyRange);
 
     //since not all browsers support this, use a try block
     try
     {
          //copy the text
          document.execCommand('copy');
     }
     catch(err)
     {
          window.alert("Your Browser Doesn't support this! Error : " + err);
     }
     //remove the selection range (Chrome throws a warning if we don't.)
     window.getSelection().removeRange(CopyRange);
     //remove the hidden div
     document.body.removeChild(hiddenCopy);
 
     //return the old selection range
     if(currentRange)
     {
          window.getSelection().addRange(currentRange);
     }
}

function getGraphDiagram() {
	function euclid(a, b) {
		return Math.sqrt(Math.pow(a[0]-b[0], 2) + Math.pow(a[1]-b[1], 2));
	}
	let output = `
\\begin{tikzpicture}[auto,node distance=8mm,>=latex,font=\\small]
\\tikzstyle{round}=[thick,draw=black,circle]
\\begin{scope}[local bounding box=graph]
	`;
	let distanceMul = 2;
	let center = graph.nodes[0].latlng;
	let totalDistance = 0;
	for(let edge of graph.branches) {
		totalDistance += euclid(graph.nodes[edge.nodes[0]].latlng, graph.nodes[edge.nodes[1]].latlng);
	}
	totalDistance /= graph.branches.length;
	distanceMul /= totalDistance;
	for(let node of graph.nodes) {
		let pos = [...node.latlng];
		pos[0] -= center[0];
		pos[1] -= center[1];
		pos[0] *= distanceMul;
		pos[1] *= distanceMul;
		let i = node.index;
		let external = "";
		if(node.externalBranches) {
			let sources = node.externalBranches.map(b => "E_{"+b.branch.source+"}");
			if(sources.length > 0)
				external = `, label=0:{Connected to $${sources.toString()}$}`;
		}
		pos.reverse();
		output += `
\\node[round, label=south:$${node.pf.toFixed(3)}$${external}] (${i}) at (${pos.toString()}) {${i+1}};\
`;
	}
	for(let edge of graph.branches) {
		output+=`
\\draw[-] (${edge.nodes[0]}) -- (${edge.nodes[1]});\
`;
	}
	output += `
\\end{scope}
\\end{tikzpicture}
	`;
	AdvancedCopy(output);
	return output;
}

var krinkOut= "";
function krink() {
	krinkOut = policyView.policy.createGraph2();
	/*
	let output = "";
	while(policyView.policy.nextStateAvailable()) {
		output += policyView.policy.createGraph();
		policyView.policy.nextState();
		policyView.policyNavigator(); // refresh
	}
	AdvancedCopy(output);
	krinkOut=output;
	return output;
	*/
}
