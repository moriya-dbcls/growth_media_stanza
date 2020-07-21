Stanza(function(stanza, params) {

    let fetchReq = (query, callback, depth) => {
        let options = {
	    method: 'post',
	    mode: 'cors',
	    headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json'},
	    body: 'query=' + encodeURIComponent(query)
	};
        // set timeout of fetch
        let fetch_timeout = function(ms, promise) {
            return new Promise(function(resolve, reject) {
                setTimeout(function() {
                    reject(new Error("timeout"))
                }, ms)
                promise.then(resolve, reject)
            })
        };
        try{
            fetch_timeout(120000, fetch(params.endpoint, options)).then(res=>{
                if(res.ok) return res.json();
                else return false;
            }).then(function(json){callback(json, depth)});
        }catch(error){
            console.log(error);
        }
    };

    let makeQuery = (uri) => {
	return "SELECT DISTINCT ?parent ?child ?label (SAMPLE (?leafs) AS ?leaf) WHERE { VALUES ?parent { <" + uri + "> } ?child <" + params.subclass + "> ?parent . ?child <" + params.label + "> ?label . OPTIONAL {?leafs <" + params.subclass + "> ?child . } } ORDER BY ?label";
    }

    let firstQuery = "SELECT DISTINCT ?label (SAMPLE (?leafs) AS ?leaf) WHERE { <" + params.root + "> <" + params.label + "> ?label . OPTIONAL {?leafs <" + params.subclass + "> ?root . } }";

    let max = 0;
    
    let renderColumn = (json, depth) => {
	let div = stanza.select("#renderDiv");
	for(let i = depth; i <= max; i++){
	    stanza.root.getElementById("column_" + i).remove();
	}
	max = depth;
	let column = document.createElement("div");
	column.classList.add("column");
	column.setAttribute("id", "column_" + depth);
	let ul = document.createElement("ul");
	column.appendChild(ul);
	for(let node of json.results.bindings){
	    let li = document.createElement("li");
	    let label = node.label.value;
	    if(node.leaf){
		label += " &gt;";
		li.classList.add("clickable");
		li.onclick = function(){
		    for(let child of this.parentNode.childNodes){
			child.classList.remove("selected");
		    }
		    this.classList.add("selected");
		    fetchReq(makeQuery(node.child.value), renderColumn, depth + 1);
		}
	    }
	    li.innerHTML = label;
	    ul.appendChild(li);
	}
	div.appendChild(column);
	column.scrollIntoView();
    }
    
    let renderFirst = (json, depth) => {
	stanza.render({
	    template: "stanza.html"
	});
	let column = document.createElement("div");
	column.classList.add("column");
	column.setAttribute("id", "column_" + depth);
	let ul = document.createElement("ul");
	column.appendChild(ul);
	let li = document.createElement("li");
	let label = json.results.bindings[0].label.value;
	if(json.results.bindings[0].leaf){
	    label += " &gt;";
	    li.classList.add("clickable");
	    li.onclick = function(){
		this.classList.add("selected");
		fetchReq(makeQuery(params.root), renderColumn, depth + 1);
	    }
	}
	li.innerHTML = label;
	ul.appendChild(li);
	stanza.select("#renderDiv").appendChild(column);
    }
       
    fetchReq(firstQuery, renderFirst, 0); 
	
});
