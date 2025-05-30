
function sortPointsPolygon(points) {
	// 1. Calculate the centroid of all points
	const centroid = points
		.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0])
		.map(val => val / points.length);

	// 2. Sort points by angle from centroid
	return points.slice().sort((a, b) => {
		const angleA = Math.atan2(a[1] - centroid[1], a[0] - centroid[0]);
		const angleB = Math.atan2(b[1] - centroid[1], b[0] - centroid[0]);
		return angleA - angleB;
	});
}
