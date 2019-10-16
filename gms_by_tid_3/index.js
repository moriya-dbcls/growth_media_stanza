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

	let group_count = {};
	let group_label = {};
	for(let gm of json.growth_media){
	    let groups = Object.keys(gm.components_group);
	    for(let group of groups){
		if(!group_count[group]){
		    group_count[group] = 0;
		    group_label[group] = gm.components_group[group].label;
		}
		group_count[group]++;
	    }
	}
	
	// sort component_group by component count
	let groups = Object.keys(group_count).map(function(group){ return {uri: group, count: group_count[group], label: group_label[group]}; });
	let sorted_groups = groups.sort(function(a,b){
	    if(a.count > b.count) return -1;
	    if(a.count < b.count) return 1;
	    return 0;
	});
	
	// hash to list 'components_group'
	for(let gm of json.growth_media){
	    gm.components_group_list = [];
	    for(let group of sorted_groups){
		if(gm.components_group[group.uri]) gm.components_group_list.push({elements: gm.components_group[group.uri].elements});
		else gm.components_group_list.push({elements: []});
	    }
	}

//	console.log(json);
	
	stanza.render({
	    template: "stanza.html"
	});
	
	let makeTable = function(){
	    let renderDiv = d3.select(stanza.select("#table_area"));
	    let table = renderDiv.append("table");
	    let popup = renderDiv.append("div").attr("id", "popup").style("display", "none").style("position", "absolute").style("padding", "10px").style("background-color", "rgba(255,255,255,0.75)").style("border", "solid 2px #888888").style("max-width", "300px");

	    // thead
	    let thead = table.append("thead");
	    let tr = thead.append("tr");
	    tr.append("th").attr("class", "header").attr("rowspan", 2).text("Medium");
	    tr.append("th").attr("class", "header").attr("rowspan", 2).text("Organisms");
	    tr.append("th").attr("class", "header").attr("colspan", sorted_groups.length).text("Components");
	    tr = thead.append("tr");
	    tr.selectAll(".role_component")
		.data(sorted_groups)
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

	    // tbody
	    let tbody = table.append("tbody");
	    tr = tbody.selectAll(".organism_line")
		.data(json.growth_media)
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
		.text(function(d){ return d.species.map(x => x.tid).join(" ,"); })
		.on("mouseover", function(d){
		    renderDiv.select("#popup")
			.style("left", (mouseX + 10) + "px").style("top", (mouseY - 10) + "px").style("display", "block")
			.text(d.species.map(x => x.label).join(", "));
		})
		.on("mouseout", function(d){
		    renderDiv.select("#popup").style("display", "none");
		});

	    let td = tr.selectAll(".component")
		.data(function(d){ return d.components_group_list; })
		.enter()
		.append("td").attr("class", "component")
	    	.filter(function(d){ return d.elements[0];})
		.selectAll(".medium_list")
		.data(function(d){ return d.elements })
		.enter()
		.append("a").attr("class", "medium_list")
		.attr("href", function(d){ return "http://ep.dbcls.jp/sparqlist/api/growth_medium?gm_id=" + d.component.uri.replace("http://purl.jp/bio/10/gmo/","");})
	    	.append("div").attr("class", "entypo-db-shape component_style")
		.on("mouseover", function(d){
		    renderDiv.select("#popup")
			.style("left", (mouseX + 10) + "px").style("top", (mouseY - 10) + "px").style("display", "block")
			.text(d.component.label);
		})		    
		.on("mouseout", function(d){
		    renderDiv.select("#popup").style("display", "none");
		});

	    // tfoot
	    let tfoot = table.append("tfoot");
	    tr = tfoot.append("tr");
	    tr.append("td");
	    tr.append("td");
	    tr.selectAll(".component_label")
		.data(sorted_groups)
		.enter()
		.append("td")
		.attr("class", "component_label")
		.append("p")
		.text(function(d){ return d.label; });
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
