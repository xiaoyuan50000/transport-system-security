$(function() {
    axios.post("/provider/getAllServiceProviderSummary", {}).then(async res => {
        let tsp = res.data.data;
        if (tsp) {
            $("#batchAssignTspSelect").empty();
            let optionHtml = `<option value=''>TSP:All</option>`;
            for(let item of tsp) {
                optionHtml += `<option value=${item.id}>${item.name}</option>`;
            }
            $("#batchAssignTspSelect").append(optionHtml);
        }
    })
    axios.post("/getMobiusUnit").then(async res => {
        $("#hubSelect").empty();
        $("#nodeSelect").empty();
        let optionHtml = `<option value=''>Hub:All</option>`;
        let optionHtml1 = `<option value=''>Node:All</option>`;
        hubNodeList = res.data.data;
        if (hubNodeList.length > 0) {
            let hubs = [...new Set(hubNodeList.map(a=>a.unit))]
            for(let item of hubs) {
                optionHtml += `<option value=${item}>${item}</option>`;
            }
            
            for(let item of hubNodeList) {
                optionHtml1 += `<option value=${item.id}>${item.subUnit}</option>`;
            }
        }
        $("#hubSelect").append(optionHtml);
        $("#nodeSelect").append(optionHtml1);
    })
    if (roleName == 'RF' || roleName == OCCMGR) {
        $(".assign-tsp-div").show();
    } else {
        $(".assign-tsp-div").hide();
    }
});