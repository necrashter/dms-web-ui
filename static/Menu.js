

var Overlay = document.getElementById("Overlay");
var MenuButton = document.getElementById("MenuButton");
var attributionHTML = `
  <h1>Attributions</h1>
  <p>Icons made by <a href="http://www.freepik.com/" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a></p>
  <p>Icons made by <a href="https://www.flaticon.com/free-icon/solar-energy_2933972" title="Good Ware">Good Ware</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a></p>
  `;

function generateInnerOverlay() {
	Overlay.innerHTML = `
	<div id="OverlayInner">
	  <div id="OverlayClose" class="blockButton">X</div>
	  <div id="OverlayInnerContent"></div>
	</div>
	`;
	document.getElementById("OverlayClose").addEventListener("click", function () {
		Overlay.classList.add("hidden");
	});
	return document.getElementById("OverlayInnerContent");
}

function d3testMenu() {
	let inner = generateInnerOverlay();
	inner.innerHTML = `
  <h1>Test</h1>
  <p>Hello World!</p>
  <h2>D3js Test</h2>
  <p>D: Damaged branches</p>
  <p>U: Unknown branches</p>
  <p>E: Energized branches</p>
  `;
	var labels = ["D", "U", "E"];
	var data = [0, 0, 0];
	Graph.branches.forEach(branch => {
		data[branch.status+1] += 1;
	});
	let x = d3.scaleLinear()
		.domain([0, d3.max(data)])
		.range([0, 420]);
	const div =  d3.create("div")
		.style("font", "15px monospace")
		.style("text-align", "right")
		.style("color", "#031E11");

	div.selectAll("div")
		.data(data)
		.join("div")
		.style("background", "rgba( 200, 255, 215, 0.8 )")
		.style("padding", "3px")
		.style("margin", "1px")
		.style("width", "0px")
		.style("height", "1em")
		.style("overflow", "hidden")
		.text((d,i) => labels[i]+": "+d)
		.transition().duration(1500)
		.style("width", d => `${x(d)}px`)
	inner.appendChild(div.node());

	Overlay.classList.remove("hidden");
}

function attributionMenu() {
	let inner = generateInnerOverlay();
	inner.innerHTML = attributionHTML;
	Overlay.classList.remove("hidden");
}

MenuButton.addEventListener("click", d3testMenu);

