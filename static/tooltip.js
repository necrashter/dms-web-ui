
/** 
 * A namespace for Tooltip related functions and variables
 */
var Tooltip = {
	div: document.getElementById("Tooltip"),
	hidden: true,
	onMouseMove: function (event) {
		// no need to move if hidden
		if(Tooltip.hidden) return;
		Tooltip.div.style.left = event.clientX+10 +"px";
		Tooltip.div.style.top = event.clientY+10 + "px";
	},
	show: function () {
		Tooltip.hidden = false;
		Tooltip.div.classList.remove("hidden");
	},
	hide: function () {
		Tooltip.hidden = true;
		Tooltip.div.classList.add("hidden");
	},
};


Tooltip.div.innerHTML = " Test";
