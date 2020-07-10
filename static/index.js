


Server.get("sample.json").then(response => {
	Graph.loadGraph(JSON.parse(response));
	Graph.render(Map);
}).catch(error => {
	alert("Failed to get graph data from server:\n"+error);
});

