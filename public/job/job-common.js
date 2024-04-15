const AppendJSONData2InputHtml = function (obj, appendClass) {
    for (let key in obj) {
        let html = `<div class="col">
            <div class="form-floating">
                <input type="text" class="form-control ${key}" name="${key}" value="${obj[key]}" autocomplete="off">
                <label>${key}</label>
            </div>
        </div>`;
        $(appendClass).append(html);
    }
}

const AppendJSONData2InputHtml2 = function (obj, appendClass) {
    for (let key in obj) {
        let val = obj[key] == null ? "" : obj[key];
        let html = `<div class="col-12 col-lg-6 col-xl-4">
            <div class="row">
                <div class="col-5">
                    <label class="col-form-label float-end">${key}</label>
                </div>
                <div class="col-7">
                    <input type="text" class="form-control" name="${key}" value="${val}" autocomplete="off">
                </div>
            </div>
        </div>`;
        $(appendClass).append(html);
    }
}

const AppendJSONData2InputHtml3 = function (key, val, appendClass) {
    let html = `<div class="col-auto mt-3">
        <div class="form-floating">
            <input type="text" class="form-control ${key}" name="${key}" value="${val}" autocomplete="off">
            <label>${key}</label>
        </div>
    </div>`;
    $(appendClass).append(html);
}

const AddInputToTable = function (key, data) {
    let value = data[key]
    if (typeof value == "undefined") {
        value = ""
    }
    return `<input type="text" class="form-control ${key}" name="${key}" value="${value}" autocomplete="off">`;
}

const AddInputToTable2 = function (key, value) {
    if (typeof value == "undefined") {
        value = ""
    }
    return `<input type="text" class="form-control ${key}" name="${key}" value="${value}" autocomplete="off">`;
}

const serializeToJson = function (d) {
    let s = {};
    d.forEach(a => {
        s[a["name"]] = a["value"]
    })
    return s
}

const JsonArrayToArray = function (jsonArr) {
    let arr = []
    if(typeof jsonArr != "undefined"){
        jsonArr.forEach(obj => {
            arr.push(obj.name)
        })
    }
    return arr
}