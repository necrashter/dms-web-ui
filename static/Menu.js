

var Overlay = document.getElementById("Overlay");
var HUD = document.getElementById("HUD");
var MenuButton = document.getElementById("MenuButton");
var attributionHTML = `
  <h1>Attributions</h1>
  <p>Icons made by <a href="http://www.freepik.com/" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a></p>
  <p>Icons made by <a href="https://www.flaticon.com/free-icon/solar-energy_2933972" title="Good Ware">Good Ware</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a></p>
  <p><b>Target Icon:</b> Icons made by <a href="https://www.flaticon.com/authors/freepik" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a></p>
  `;


Overlay.hide = function() {
	Overlay.classList.add("hidden");
}

function generateCentredDiv() {
	document.getElementById("OverlayContent").innerHTML = `
	<div id="Centred">
	  <div id="OverlayClose" class="blockButton">X</div>
	  <div id="CentredContent"></div>
	</div>
	`;
	document.getElementById("OverlayClose").addEventListener("click", function () {
		Overlay.classList.add("hidden");
	});
	return document.getElementById("CentredContent");
}

function aboutButton() {
	let inner = generateCentredDiv();
	inner.innerHTML = attributionHTML;
	Overlay.classList.remove("hidden");
}

function horizontalBarPlot(data, width, height, options={}) {
	let margin = {top: 20, right: 40, bottom: 40, left: 90};
	if(options.margin) Object.assign(margin, options.margin);
	// effective width and height
	let ew = width - margin.right - margin.left;
	let eh = height - margin.top - margin.bottom;
	let SVG = d3.create("svg")
		.attr("width", width )
		.attr("height", height )
	let svg = SVG.append("g")
		.attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");
	var x = d3.scaleLinear()
		.domain([0, d3.max(data.map(d => d.value))])
		.range([ 0, ew]);
	svg.append("g")
		.attr("transform", "translate(0," + eh + ")")
		.call(d3.axisBottom(x))
		.selectAll("text")
		.attr("font-size", "16px")
		//.attr("transform", "translate(-10,0)rotate(-45)")
		//.style("text-anchor", "end");
	var y = d3.scaleBand()
		.range([ 0, eh ])
		.domain(data.map((d) => d.name))
		.padding(.1);
	svg.append("g")
		.call(d3.axisLeft(y))
		.selectAll("text")
		.attr("font-size", "16px");
	svg.selectAll("myRect")
		.data(data)
		.enter()
		.append("rect")
		.attr("x", x(0) )
		.attr("y", (d) => y(d.name) )
		.attr("width", 0)
		.attr("height", y.bandwidth() )
		.attr("fill", "#14fdce")
		.on("mouseover", (d) => {
			Tooltip.div.innerHTML = d.name + " " + d.value;
			Tooltip.show();
		})
		.on("mouseout", Tooltip.hide)
		//.on("click", (d) => console.log(d))
		.transition().duration(1000)
		.attr("width", (d) => x(d.value))
	svg.append("g")
		.attr("fill", "#022011")
		.attr("text-anchor", "end")
		.attr("font-family", "sans-serif")
		.attr("font-size", 16)
    .selectAll("text")
    .data(data)
    .join("text")
		.attr("x", d => x(d.value))
		.attr("y", (d) => y(d.name) + y.bandwidth() / 2)
		.attr("dy", "0.35em")
		.attr("dx", -4)
		.text(d => d.value)
    .call(text => text.filter(d => x(d.value) - x(0) < 20) // short bars
		.attr("dx", +4)
		.attr("fill", "#14fdce")
		.attr("text-anchor", "start"));
	return SVG.node();
}

function statsButton() {
	let content = d3.select("#OverlayContent").html("")
		.append("div").attr("id", "OverlayRight");
	let box0 = content.append("div").classed("halfBox", true)
		.append("div").classed("contentBox", true);
	box0.append("h1").text("Branch Status");
	box0.append(createBranchStats);


	let box1 = content.append("div").classed("halfBox", true)
		.append("div").classed("contentBox", true);
	box1.append("h1").text("Branch Status");
	var labels = ["Damaged", "Unknown", "Energized"];
	var data = [0, 0, 0];
	Graph.branches.forEach(branch => {
		data[branch.status+1] += 1;
	});
	let width = box1.node().getBoundingClientRect().width;
	let height = content.node().getBoundingClientRect().height / 4;
	box1.append(() => 
		horizontalBarPlot(data.map((d,i) => {
			return {name: labels[i],
				value: d}
		}), width, height, )
	);

	content.append("div").classed("halfBox", true)
		.append("div").classed("contentBox", true)
		.text("Testing testing testing testing testing testing ");
	content.append("div").classed("halfBox", true)
		.append("div").classed("contentBox", true)
		.text("Testing testing testing testing testing testing ");
}


function generateSideBar() {
	let div = d3.create("div").attr("id", "OverlayLeftBar");
	div.append("div").attr("class","blockButton")
		.text("X")
		.on("click", () => {
			Overlay.classList.add("hidden");
		});
	div.append("hr");
	div.append("div").attr("class","blockButton")
		.text("Stats")
		.on("click", () => {
			Overlay.classList.add("hidden");
		});
	return div.node();
}

function createBranchStats() {
	var labels = ["Damaged", "Unknown", "Energized"];
	var data = [0, 0, 0];
	Graph.branches.forEach(branch => {
		data[branch.status+1] += 1;
	});
	let domain = [0, d3.max(data)];
	let x = d3.scaleLinear()
		.domain(domain)
		.range([0, 80]);
	const div =  d3.create("div").classed("barWrap", true);

	let join = div.selectAll("div").data(data).join("div")
		.classed("horizontalBarWrap", true);
	let bar = join.append("div")
		.classed("horizontalBar", true)
		.style("width", "0px")
	bar.transition().duration(1500)
		.style("width", d => `${x(d)}%`)
	bar.append("p").text((d) => d)
	join.append("div")
		.text((_,i) => labels[i]);
	return div.node();
}

function d3testMenu() {
	let inner = generateCentredDiv();
	inner.innerHTML = `
  <h1>Test</h1>
  <p>Hello World!</p>
  <h2>D3js Test</h2>
  <p>D: Damaged branches</p>
  <p>U: Unknown branches</p>
  <p>E: Energized branches</p>
  `;
	let div = createBranchStats();
	inner.appendChild(div);

	Overlay.classList.remove("hidden");
}

MenuButton.addEventListener("click", function() {
	Overlay.innerHTML = `
		<div id="OverlayContent"></div>
		<div id="OverlayLeftBar">
			<div class="blockButton" onclick="Overlay.hide()">X</div>
			<div class="block">
				<div class="blockButton" onclick="statsButton()">Stats</div>
			</div>
			<div class="blockButton" onclick="aboutButton()">About</div>
		</div>
		`;
	statsButton();
	Overlay.classList.remove("hidden");
});


function showModalOverlay(content, options={}) {
	Overlay.innerHTML = `
	<div id="Centred">
	  <div id="OverlayClose" class="blockButton">X</div>
	  <div id="CentredContent"></div>
	</div>
	`;
	document.getElementById("OverlayClose").addEventListener("click", function () {
		Overlay.classList.add("hidden");
		Overlay.classList.remove("warning");
	});
	if(options.warning) Overlay.classList.add("warning");
	Overlay.classList.remove("hidden");
	document.getElementById("CentredContent").appendChild(content);
}
