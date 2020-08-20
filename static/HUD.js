const BottomRightPanel = document.getElementById("BottomRightPanel");
const BottomRightPanelContent = BottomRightPanel.querySelector(".content");

const Styles = [
	{ name: "CyberPunk", folder: "cyberpunk-style" },
	{ name: "999$ Monitor Stand", folder: "apfel-style" },
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
