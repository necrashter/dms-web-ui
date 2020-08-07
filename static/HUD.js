const BottomRightPanel = document.getElementById("BottomRightPanel");
const BottomRightPanelContent = BottomRightPanel.querySelector(".content");

const Styles = [
	{ name: "CyberPunk", folder: "cyberpunk-style" },
	{ name: "Medieval", folder: "medieval-style" },
];

function changeStyle(folderName) {
	document.getElementById("index-css").href = folderName+"/index.css";
	document.getElementById("graph-css").href = folderName+"/graph.css";
	document.getElementById("custom-select-css").href= folderName+"/CustomSelect.css";
	document.getElementById("custom-checkbox-css").href = folderName+"/CustomCheckbox.css";
}
