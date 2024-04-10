$(function () {
            
    // if($('#typeOfVehicle option:selected').val()){
    //     alert('---indent-----');
    // console.log($('#typeOfVehicle option:selected').val());
    // $('#driver-row').css('display', 'block')
    // } else {
    //     alert('---indent-----');
    //     $('#driver-row').css('display', 'none')
    // }

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

    $("#hubSelect").on("change", function () {
        let hub = $(this).val()
        let node = hubNodeList
        if(hub!=""){
            node = hubNodeList.filter(a => a.unit == hub)
        }
        $("#nodeSelect").empty();
        let optionHtml1 = `<option value=''>Node:All</option>`;
        for(let item of node) {
            optionHtml1 += `<option value=${item.id}>${item.subUnit}</option>`;
        }
        $("#nodeSelect").append(optionHtml1);
        table.ajax.reload(null, true);
    })

    $("#nodeSelect").on("change", function () {
        table.ajax.reload(null, true);
    })
})