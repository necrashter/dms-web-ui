fallbackGraph = {
    "nodes": [
        {
            "latlng": [
                41.01734009875206,
                29.1108512878418
            ],
            "pf": 0.03698379889128911,
            "status": 1
        },
        {
            "latlng": [
                41.034693545339685,
                29.099521636962894
            ],
            "pf": 0.9148521965848937,
            "status": 0
        },
        {
            "latlng": [
                41.051524608048965,
                29.104671478271488
            ],
            "pf": 0.34119230216877927,
            "status": 0
        },
        {
            "latlng": [
                41.047899819801714,
                29.07669067382813
            ],
            "pf": 0.9082687604545456,
            "status": 0
        },
        {
            "latlng": [
                41.03301020232474,
                29.06415939331055
            ],
            "pf": 0.07397644202305376,
            "status": 0
        },
        {
            "latlng": [
                41.014620114274955,
                29.077720642089847
            ],
            "pf": 0.5807757574946012,
            "status": 0
        },
        {
            "latlng": [
                41.009568416569934,
                29.05197143554688
            ],
            "pf": 0.13682184129199382,
            "status": 0
        },
        {
            "latlng": [
                41.02407481503795,
                29.036006927490238
            ],
            "pf": 0.8754028480152974,
            "status": 0
        },
        {
            "latlng": [
                40.99479969470605,
                29.033775329589847
            ],
            "pf": 0.693212626480581,
            "status": 0
        },
        {
            "latlng": [
                40.996095329042525,
                29.096260070800785
            ],
            "pf": 0.0868797205434576,
            "status": 0
        },
        {
            "latlng": [
                40.997520497401055,
                29.065017700195312
            ],
            "pf": 0.3976469787339173,
            "status": 0
        },
        {
            "latlng": [
                40.97704694022287,
                29.068794250488285
            ],
            "pf": 0.5105499328800183,
            "status": 0
        },
        {
            "latlng": [
                40.9855999586963,
                29.123725891113285
            ],
            "pf": 0.47675007999751096,
            "status": 0
        }
    ],
    "branches": [
        {
            "nodes": [
                0,
                5
            ]
        },
        {
            "nodes": [
                5,
                6
            ]
        },
        {
            "nodes": [
                6,
                7
            ]
        },
        {
            "nodes": [
                6,
                8
            ]
        },
        {
            "nodes": [
                0,
                1
            ]
        },
        {
            "nodes": [
                1,
                2
            ]
        },
        {
            "nodes": [
                1,
                3
            ]
        },
        {
            "nodes": [
                1,
                4
            ]
        },
        {
            "nodes": [
                0,
                9
            ]
        },
        {
            "nodes": [
                9,
                10
            ]
        },
        {
            "nodes": [
                9,
                11
            ]
        },
        {
            "nodes": [
                9,
                12
            ]
        }
    ],
    "externalBranches": [
        {
            "source": 0,
            "node": 0,
            "status": 1
        }
    ],
    "resources": [
        {
            "latlng": [
                41.01863528998129,
                29.130249023437504
            ],
            "type": null
        }
    ],
    "view": {
        "lat": 41.003803826826505,
        "lng": 29.081583023071293
    },
    "zoom": 13
}

var graph;

function loadGraphFromServer(g) {
	let url = "graphs/" + g.filename;
	return Network.get(url).then(response => {
		graph.loadGraph(JSON.parse(response));
		graph.fileUrl = url;
		graph.solutions = g.solutions;
	}).catch(error => {
		alert("Failed to get graph data from server:\n"+error);
	});
}

/**
 * Gets the graph list from server, and creates the selection UI in the right
 * panel.
 * graph must be cleared and null before calling this function.
 */
function openSelectGraph() {
	graph = new Graph(mainMap);
	Network.get("/get-graphs").then(response => {
		let fileList = JSON.parse(response);
		console.log(fileList);
		selectGraph(fileList);
	}).catch(error => {
		selectGraph({'': [
			{name: "Test Graph",
				view: fallbackGraph.view,
				load: () => new Promise((resolve) => {
					graph.loadGraph(fallbackGraph);
					resolve();
				})}
		]}, div => {
			div.append("p")
				.text("Failed to get graph list from server: "+error.message)
				.style("color", "red");
			div.append("p")
				.text("You can load a built-in graph.")
		});
	});
}

openSelectGraph();
