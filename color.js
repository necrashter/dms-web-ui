// Color utilities

function hsvToRgb(h, s, v) {
	let h_i = Math.floor(h * 6);
	let f = h * 6 - h_i;
	let p = v * (1 - s);
	let q = v * (1 - f * s);
	let t = v * (1 - (1 - f) * s);

	let r, g, b;
	switch (h_i % 6) {
		case 0:
			r = v; g = t; b = p;
			break;
		case 1:
			r = q; g = v; b = p;
			break;
		case 2:
			r = p; g = v; b = t;
			break;
		case 3:
			r = p; g = q; b = v;
			break;
		case 4:
			r = t; g = p; b = v;
			break;
		case 5:
			r = v; g = p; b = q;
			break;
	}

	return [
		Math.floor(r * 256),
		Math.floor(g * 256),
		Math.floor(b * 256)
	];
}

class ColorGenerator {
	constructor() {
		this.h = 0.0;
	}
	reset() {
		this.h = 0.0;
	}
	generate() {
		let h = this.h;
		// Golden ratio conjugate.
		this.h = (h + 0.618033988749895) % 1;
		return hsvToRgb(h, 0.5, 0.9);
	}
}

function rgbToHex([r, g, b]) {
  return (
    "#" +
    [r, g, b]
      .map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}
