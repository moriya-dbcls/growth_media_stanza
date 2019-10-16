Stanza(function(stanza, params) {

    let formBody = [];

    for (let key in params) {
	if (params[key]) {
	    formBody.push(key + "=" + encodeURIComponent(params[key]));
	}
    }
    
    let options = {
	method: "POST",
	mode: "cors",
	body: formBody.join("&"),
	headers: {
	    'Accept': 'application/json',
	    'Content-Type': 'application/x-www-form-urlencoded'
	}
    };
    
    let apiUrl = "http://ep.dbcls.jp/sparqlist/api/";
    let apiName = "gms_by_kegg_tids_3";
    let q = fetch(apiUrl + apiName, options).then(res => res.json());
    
    q.then(function(json) {

	// sort parent component by child component count
	let parents = Object.keys(json.parent_count).map(function(x){ return {uri: x, count: json.parent_count[x].count, label: json.parent_count[x].label}; });
	let sorted_parents = parents.sort(function(a,b){
	    if(a.count > b.count) return -1;
	    if(a.count < b.count) return 1;
	    return 0;
	});

	// sort gm by species count
	let gms = Object.keys(json.gm_count).map(function(x){ return {uri: x, count: json.gm_count[x].count, label: json.gm_count[x].label};});
	let sorted_gms = gms.sort(function(a,b){
	    if(a.count > b.count) return -1;
	    if(a.count < b.count) return 1;
	    return 0;
	});
	for(let i = 0; i < sorted_gms.length; i++){
	    let parent_component = [];
	    for(let j = 0; j < sorted_parents.length; j++){
		console.log(sorted_gms[i].uri + " " + sorted_parents[j].uri);
		if(json.gm_component[sorted_gms[i].uri][sorted_parents[j].uri]) parent_component.push(json.gm_component[sorted_gms[i].uri][sorted_parents[j].uri]);
		else parent_component.push({});
	    }
	    sorted_gms[i].component = parent_component;
	}

	console.log(sorted_gms);
	
	stanza.render({
	    template: "stanza.html"
	});
	
	let makeTable = function(){
	    let renderDiv = d3.select(stanza.select("#table_area"));
	    let table = renderDiv.append("table");
	    let popup = renderDiv.append("div").attr("id", "popup").style("display", "none").style("position", "absolute").style("padding", "10px").style("background-color", "rgba(255,255,255,0.75)").style("border", "solid 2px #888888").style("max-width", "300px");
	    let thead = table.append("thead");
	    let tr = thead.append("tr");
	    tr.append("th").attr("class", "header").attr("rowspan", 2).text("Medium");
	    tr.append("th").attr("class", "header").attr("rowspan", 2).text("Organisms");
	    tr.append("th").attr("class", "header").attr("colspan", sorted_parents.length).text("Components");
	    tr = thead.append("tr");
	    tr.selectAll(".role_component")
		.data(sorted_parents)
		.enter()
		.append("th").attr("class", "role_component")
		.append("a").attr("href", function(d){ return "http://ep.dbcls.jp/sparqlist/api/gmo_component?gmo_id=" + d.uri.replace("http://purl.jp/bio/10/gmo/","");})
		.append("div").attr("class", "entypo-db-shape role_component_style")
		.on("mouseover", function(d){
		    renderDiv.select("#popup")
			.style("left", (mouseX + 10) + "px").style("top", (mouseY - 10) + "px").style("display", "block")
			.text(d.label);
		})		    
		.on("mouseout", function(d){
		    renderDiv.select("#popup").style("display", "none");
		});
	    let tbody = table.append("tbody");

	    tr = tbody.selectAll(".organism_line")
		.data(sorted_gms)
		.enter()
		.append("tr").attr("class", "organism_line");
	    tr.append("td").attr("class", "medium")
		.append("a").attr("href", function(d){ return "http://ep.dbcls.jp/sparqlist/api/growth_medium?gm_id=" + d.uri.replace("http://purl.jp/bio/10/gm/","");})
		.text(function(d){ return d.uri.replace("http://purl.jp/bio/10/gm/","");})
	    	.on("mouseover", function(d){
		    renderDiv.select("#popup")
			.style("left", (mouseX + 10) + "px").style("top", (mouseY - 10) + "px").style("display", "block")
			.text(d.label);
		})
		.on("mouseout", function(d){
		    renderDiv.select("#popup").style("display", "none");
		});
	    tr.append("td")
		.attr("class", "organism")
		.text(function(d){ return json.gm_sp[d.uri].species.map(x => x.tid).join(" ,"); })
		.on("mouseover", function(d){
		    renderDiv.select("#popup")
			.style("left", (mouseX + 10) + "px").style("top", (mouseY - 10) + "px").style("display", "block")
			.text(json.gm_sp[d.uri].species.map(x => x.label).join(", "));
		})
		.on("mouseout", function(d){
		    renderDiv.select("#popup").style("display", "none");
		});

	    let td = tr.selectAll(".component")
		.data(function(d){ return d.component })
		.enter()
		.append("td").attr("class", "component")
	    	.filter(function(d){ return d[0];})
		.selectAll(".medium_list")
		.data(function(d){ return d })
		.enter()
		.append("a").attr("class", "medium_list")
		.attr("href", function(d){ return "http://ep.dbcls.jp/sparqlist/api/growth_medium?gm_id=" + d.component.id;})
	    	.append("div").attr("class", "entypo-db-shape component_style")
		.on("mouseover", function(d){
		    renderDiv.select("#popup")
			.style("left", (mouseX + 10) + "px").style("top", (mouseY - 10) + "px").style("display", "block")
			.text(d.component.label);
		})		    
		.on("mouseout", function(d){
		    renderDiv.select("#popup").style("display", "none");
		}); 
	}
	
	let mouseX = 0;
	let mouseY = 0;
	document.body.addEventListener("mousemove", function(e){
	    mouseX = e.pageX
	    mouseY= e.pageY;
	});
	makeTable();
    });

});
