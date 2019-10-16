Stanza(function(stanza, params) {

    let newick_url = "";
    if(params["newick"]) newick_url = params["newick"];

    let options_text = {
        method: "get",
        mode:  "cors"
    };

    // 'kegg_code - kegg_T_num' SPARQList via KEGG API
    //  将来的にはTogoDB "http://dev.togodb.org/sparql/kegg_gold" を使う？今はSPARQL endpointに不具合あり。遅い。
    let code_tid_api = "http://ep.dbcls.jp/sparqlist/api/gms_kegg_code_tid";
    
    let options_json = {
        method: "POST",
        mode:  "cors",
        headers: {
            "Accept": "application/json",
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };

    // get 'newick format tree' & 'kegg_code - kegg_T_num table'
    let q = Promise.all([fetch(newick_url, options_text).then(res => res.text()), fetch(code_tid_api, options_json).then(res => res.json())]);

    q.then(function([newick, code2tnum]){
		
	// make branch node ID
	newick = newick.replace(/\n/g, "");
	if(newick.match(/\):/)){
	    let array = newick.split(/\)/);
	    let count = 1;
	    for(let i = 0; i < array.length; i++){
		if(array[i].match(/^:/)){
		    array[i] = "n" + count + array[i];
		    count++;
		}
	    }
	    newick = array.join('\)');
	}
	if(newick.match(/\);$/)) newick = newick.replace(/^\(/, "").replace(/\);$/, "");

	// newick to tree json
	let stack = [];
	let child;
	let root = [];
	let nodeObj = root;

	let array = newick.split('').reverse();
	for(let i = 0; i < array.length; i++){
	    if(array[i] == ')'){
		stack.push(nodeObj);
		nodeObj = child.children = [];
	    }else if(array[i] == '('){
		nodeObj = stack.pop();
	    }else if(array[i] == ','){
		//
	    }else{
		let string = "";
		for(let j = i; j < array.length; j++){
		    if(array[j] == '(' || array[j] == ')' || array[j] == ','){
			i = j - 1;
			let element = string.split(':');
			let obj = {name: element[0], distance: element[1], type: "branch"};
			if(element[0].match('_')){
			    obj = {name: element[0].split('_')[1], distance: element[1], tag: element[0].split('_')[0], type: "leaf"};
			}
			nodeObj.push(child = obj);
			break;
		    }
		    string = array[j] + string;
		}
	    }
	}
	let json = {name: "root", children: root};

	// make T_num list for 'gms_by_tid' stanza
	let mkLeafList = function(json){
	    if(json.type && json.type == "leaf") return [code2tnum[json.name].tid];
	    else if(json.children){
		let array = [];
		for(let i = 0; i < json.children.length; i++){
		    array = array.concat(mkLeafList(json.children[i]));
		}
		json.leaf_list = array;
		return array;
	    }
	}

	mkLeafList(json);

//	console.log(json);

	stanza.render({
	    template: "stanza.html",
	});
	
	//=====  D3.js v4/v5 cluster (ref. https://wizardace.com/d3-cluster-radial/)

	// render
	let renderDiv = d3.select(stanza.select("#renderDiv"));
	let r = 400;

	let svg = renderDiv.append("svg")
	    .attr("version", 1.1)
            .attr("xmlns", "http://www.w3.org/2000/svg")
	    .attr("id", "roundtree")
	    .attr("width", r * 2)
	    .attr("height", r * 2);
	let popup = renderDiv.append("div").attr("id", "popup").style("display", "none").style("position", "absolute").style("padding", "10px").style("background-color", "rgba(255,255,255,0.75)").style("border", "solid 2px #888888").style("max-width", "300px");
	let g = svg.append("g")
	    .attr("transform", "translate(" + r + "," + r + ")");

	let tree_shape = 0;
	let draw_data = d3.hierarchy(json);
	let cluster = d3.cluster().size([360, r - 80]);  // cluster type
	let tree = d3.tree().size([360, r - 80]).separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });   // tree type
	cluster(draw_data);

	let link = g.selectAll(".edge")
	    .data(draw_data.links())
	    .enter()
	    .append("path")
	    .attr("class", "edge")
	    .attr("fill", "none")
	    .attr("stroke", "#555")
	    .attr("stroke-width", "1.5px")
	    .attr("opacity", "0.6")
	    .attr("d", d3.linkRadial()
		  .angle(function(d) { return (d.x + 90) * Math.PI / 180; })
		  .radius(function(d) { return d.y; }));
	
	let node = g.selectAll(".node")
	    .data(draw_data.descendants())
	    .enter()
	    .append("g")
	    .attr("class", function(d){ let type = ""; if(d.data.tag) type = " " + d.data.tag + "Node"; return "node " + d.data.type + "Node" + type;} )
	    .attr("transform", function(d) { return "rotate(" + (d.x) + ")translate(" + d.y + ")"; })
	
	node.append("circle")
	    .attr("id", function(d){ return d.data.name; })
	    .attr("r", 4.5);

	svg.selectAll(".leafNode").append("text")
	    .attr("dy", 3)
	    .style("text-anchor", function(d) { return d.x < 90 || d.x > 270 ? "start" : "end"; })
	    .attr("transform", function(d) { return d.x < 90 || d.x > 270 ? "translate(8)" : "rotate(180)translate(-8)"; })
	    .text(function(d) { return d.data.name; })
	    .on("mouseover", function(d){
                renderDiv.select("#popup")
                    .style("left", (mouseX + 10) + "px").style("top", (mouseY - 10) + "px").style("display", "block")
                    .text(code2tnum[d.data.name].label);
            })
            .on("mouseout", function(d){
                renderDiv.select("#popup").style("display", "none");
            });
		

	svg.selectAll(".branchNode")
	    .on("click", function(d){
		let tax = d.data.leaf_list.join(",");
		let gm_stanza = d3.select(stanza.select("#gm_stanza")).html("");
		gm_stanza.append("togostanza-gms_by_tid_3")
		    .attr("t_id", tax);
	    })
	    .on("mouseover", function(d){ svg.select("#" + d.data.name).style("stroke", "#89ffff"); })
	    .on("mouseout", function(d){ svg.select("#" + d.data.name).style("stroke", "#cccccc"); });

	// re-plot by 'change tree shape' button
	let rePlot = function(){
	    draw_data = d3.hierarchy(json);
	    if(tree_shape == 0){ tree(draw_data); tree_shape = 1; }   // tree type
	    else{ cluster(draw_data); tree_shape = 0; }               // cluster type

	    g.selectAll(".edge")
		.data(draw_data.links())
		.transition()
                .delay(200)
                .duration(700)
		.attr("d", d3.linkRadial()
		      .angle(function(d) { return (d.x + 90) * Math.PI / 180; })
		      .radius(function(d) { return d.y; }));
	    g.selectAll(".node")
		.data(draw_data.descendants())
		.transition()
                .delay(200)
                .duration(700)
		.attr("transform", function(d) { return "rotate(" + (d.x) + ")translate(" + d.y + ")"; });
	}
	
	// download button
	let downloadImg = function(format){
	    let filename = "tree";
	    let url, img, canvas, context;
	    let pngZoom = 2;  // png resolution rate
	    
	    let style = stanza.select("main").getElementsByTagName("style")[0].outerHTML.replace(/[\r\n]/g, "");
	    let tmp = stanza.select("#roundtree").outerHTML.match(/^([^\>]+\>)(.+)$/);
	    let string = tmp[1] + style + tmp[2];
	    let w = parseInt(d3.select(stanza.select("#roundtree")).style("width"));
	    let h = parseInt(d3.select(stanza.select("#roundtree")).style("height"));

	    // downloading function
	    let aLinkClickDL = function(){
		if(format == "png"){
		    context.drawImage(img, 0, 0, w, h, 0, 0, w * pngZoom, h * pngZoom);
		    url = canvas.node().toDataURL("image/png");
		}
		
		let a = d3.select("body").append("a");	
		a.attr("class", "downloadLink")
		    .attr("download", filename)
		    .attr("href", url)
		    .text("test")
		    .style("display", "none");
		
		a.node().click();
		
		setTimeout(function() {
		    window.URL.revokeObjectURL(url);
		    if(format == "png") canvas.remove();
		    a.remove();
		}, 10)  
	    };

	    if(format == "svg"){  // SVG
		filename += ".svg";
		let blobObject = new Blob([string], { "type" : "data:image/svg+xml;base64" })
    		url = window.URL.createObjectURL(blobObject)
		aLinkClickDL();
	    }else if(format == "png"){  // PNG
		filename += ".png";
		img = new Image();
		img.src = "data:image/svg+xml;utf8," + encodeURIComponent(string);
		img.addEventListener('load', aLinkClickDL, false);
		
		canvas = d3.select("body").append("canvas")
		    .attr("width", w * pngZoom)
		    .attr("height", h * pngZoom)
		    .style("display", "none");
		context = canvas.node().getContext("2d");
	    }
	}

	// append buttons
	let dlButtonDiv = renderDiv.append("div")
	    .attr("id", "dl_button")
	    .style("text-align", "right");

	dlButtonDiv.append("input")
	    .attr("class", "downloadButton")
	    .attr("type", "button")
	    .attr("value", "change tree shape")
	    .on("click", function(){ rePlot(); });
	
	dlButtonDiv.append("input")
	    .attr("class", "downloadButton")
	    .attr("type", "button")
	    .attr("value", "svg")
	    .on("click", function(){ downloadImg("svg"); });
	
	dlButtonDiv.append("input")
	    .attr("class", "downloadButton")
	    .attr("type", "button")
	    .attr("value", "png")
	    .on("click", function(){ downloadImg("png"); });
	
        let mouseX = 0;
        let mouseY = 0;
        document.body.addEventListener("mousemove", function(e){
            mouseX = e.pageX
            mouseY= e.pageY;
        });
    });
});
