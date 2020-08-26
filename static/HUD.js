const BottomRightPanel = document.getElementById("BottomRightPanel");
const BottomRightPanelContent = BottomRightPanel.querySelector(".content");

const Styles = [
	{ name: "CyberPunk", folder: "cyberpunk-style" },
	{ name: "$999 Monitor Stand", folder: "apfel-style" },
	{ name: "Medieval", folder: "medieval-style" },
];

function changeStyle(folderName) {
	document.getElementById("index-css").href = folderName+"/index.css";
	document.getElementById("graph-css").href = folderName+"/graph.css";
	document.getElementById("custom-select-css").href= folderName+"/CustomSelect.css";
	document.getElementById("custom-checkbox-css").href = folderName+"/CustomCheckbox.css";
}


BottomRightPanel.show = function(info=null) {
	BottomRightPanel.contentInfo = info;
	BottomRightPanel.classList.remove("hidden");
}

BottomRightPanel.hide = function() {
	BottomRightPanel.contentInfo = null;
	BottomRightPanel.classList.add("hidden");
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
