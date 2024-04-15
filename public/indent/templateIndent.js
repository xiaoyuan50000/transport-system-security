let templateResourceTypeElem = $("#template-indent-right-form select[name='serviceType']")
let templateServiceModeElem = $("#template-indent-right-form select[name='serviceMode']")
let templateResourceElem = $("#template-indent-right-form select[name='typeOfVehicle']")
let templateNoOfVehicleElem = $("#template-indent-right-form input[name='noOfVehicle']")
let templateDriverElem = $("#template-indent-right-form input[name='driver']")
let templateNoOfDriverElem = $("#template-indent-right-form input[name='noOfDriver']")
// let templateRecurringElem = $("#template-indent-right-form select[name='repeats']")
// let templateLitresElem = $("#template-indent-right-form input[name='litres']")
// let templateFuelResourceElem = $("#template-indent-right-form select[name='fuelResource']")
let templateList = []
let templateIndentModal = document.getElementById('templateIndentModal')
let templateIndentServiceTypeList

$(function () {
    templateIndentModal.addEventListener('hidden.bs.modal', function (event) {
        cleanTemplateIndent()
        templateList = []
        $("#template-indent-left-form .list-group").empty()
        $("#templateIndentName").val('')
        $("#templateIndentModal").modal("dispose");
    })
    templateIndentModal.addEventListener('show.bs.modal', async function (event) {
        await InitCategory()
    })

    templateResourceTypeElem.on("change", async function () {
        let serviceType = $(this).val()
        await initTemplateServiceMode(serviceType);
    })

    templateServiceModeElem.on("change", async function () {
        let serviceModeId = $(this).val()
        await changeTemplateServiceMode(serviceModeId);
    })
    templateResourceElem.on("change", async function () {
        let val = $(this).val()
        await changeTemplateResource(val);
    })
    templateDriverElem.on("click", async function () {
        let checked = $(this).prop('checked')
        OnCheckTemplateDriver(checked)
    })

    templateNoOfDriverElem.on("input", async function () {
        if (templateResourceElem.val() == "-") {
            return
        }
        let noOfVehicle = templateNoOfVehicleElem.val();
        noOfVehicle = noOfVehicle ? noOfVehicle : 0;
        let driverNum = templateNoOfDriverElem.val();
        if (parseInt(driverNum) > parseInt(noOfVehicle)) {
            templateNoOfDriverElem.val(noOfVehicle);
        }
    })
})

const cleanTemplateIndent = function () {
    templateResourceTypeElem.val('')
    templateServiceModeElem.val('')
    templateResourceElem.val('')
    templateNoOfVehicleElem.val('')
    templateNoOfDriverElem.val('')
    // templateRecurringElem.val('')
    // templateLitresElem.val('')
    // templateFuelResourceElem.val('')
    templateDriverElem.prop('checked', false)
}

const InitCategory = async function () {
    await axios.post("/getServiceTypeByGroupId", { selectedGroupId: top.user.groupId }).then(res => {
        templateIndentServiceTypeList = res.data.data.serviceType
        let categoryList = res.data.data.categorys
        $("#template-indent-category-radio").empty()
        let html = ""
        for (let category of categoryList) {
            let id = `C-${category.replace(" ", "")}`
            html += `<div class="col-sm-6"><div class="form-check">
            <input class="form-check-input" type="radio" name="category" id="${id}" style="margin-top: 1px" onChange="changeTemplateCategory(this)" value="${category}">
            <label class="form-check-label" for="${id}">${category}</label>
        </div></div>`
        }
        $("#template-indent-category-radio").append(`<div class="row h-100 align-items-center">${html}</div>`)
        templateResourceTypeElem.empty()
        templateServiceModeElem.empty()
    })
}

const changeTemplateCategory = function (e) {
    cleanTemplateIndent()
    let category = $(e).val()
    // if (category.toUpperCase() == "FUEL") {
    //     $("#template-indent-content").hide()
    //     $("#template-indent-fuel-content").show()
    // } else {
    //     $("#template-indent-content").show()
    //     $("#template-indent-fuel-content").hide()
    // }
    let filterServiceTypeList = templateIndentServiceTypeList.filter(item => item.category == category)
    templateResourceTypeElem.empty()
    let data = `<option value=""></option>`
    for (let item of filterServiceTypeList) {
        data += `<option value="${item.id}" data-category="${item.category}">${item.name}</option>`
    }
    templateResourceTypeElem.append(data)
    templateServiceModeElem.empty()
}

const initTemplateServiceMode = async function (serviceTypeId) {
    if (!serviceTypeId) {
        templateServiceModeElem.empty();
        return;
    }
    await axios.post("/getServiceModeByServiceType", { serviceTypeId: serviceTypeId }).then(res => {
        let datas = res.data.data
        templateServiceModeElem.empty()
        let data = `<option value=""></option>`
        for (let item of datas) {
            data += `<option value="${item.id}" data-value="${item.value}" data-minHour="${item.minDur}">${item.name}</option>`
        }
        templateServiceModeElem.append(data);
    })
}

const changeTemplateServiceMode = async function (serviceModeId) {
    // init resource
    let vehicleTypeSelect = await InitVehicleType(serviceModeId)
    templateResourceElem.empty();
    templateResourceElem.append(`<option value=""></option>`)

    if ($(`#template-indent-category-radio input[type=radio][value="MV"]`).prop("checked")) {
        templateResourceElem.append(`<option value="-">-</option>`)
    }
    for (let item of vehicleTypeSelect) {
        templateResourceElem.append(`<option value="${item.typeOfVehicle}">${item.typeOfVehicle}</option>`)
    }

    // init recurring
    // let serviceModeValue = templateServiceModeElem.find("option:selected").attr("data-value").toLowerCase()
    // await axios.post("/getRecurringByServiceMode", { serviceModeValue: serviceModeValue }).then(res => {
    //     let datas = res.data.data
    //     templateRecurringElem.empty()
    //     let optLength = datas.length;
    //     let data = `<option value=""></option>`
    //     for (let item of datas) {
    //         data += `<option value="${item.value}">${item.value}</option>`
    //     }
    //     templateRecurringElem.append(data)
    //     if (optLength == 1) {
    //         templateRecurringElem.val(datas[0].value);
    //     }
    // })
}

const changeTemplateResource = async function (vehicle = null) {
    $('#template-indent-vehicle-row').css('display', 'block')
    templateNoOfVehicleElem.val(1);
    templateDriverElem.attr("disabled", false)
    if (!vehicle) {
        vehicle = templateResourceElem.find('option:selected').val()
    }
    if (vehicle) {
        if (vehicle != "-") {
            await axios.post("/checkVehicleDriver", { vehicle }).then(res => {
                $('#template-indent-driver-row').css('display', res.data.data == 1 ? 'block' : 'none')
                OnCheckTemplateDriver(false)
            })
        } else {
            $('#template-indent-driver-row').css('display', 'block')
            $('#template-indent-vehicle-row').css('display', 'none')
            templateNoOfVehicleElem.val(0);
            OnCheckTemplateDriver(true)
            templateDriverElem.attr("disabled", true)
        }
    }
}

const OnCheckTemplateDriver = function (checked) {
    templateDriverElem.prop("checked", checked)
    if (checked) {
        $("#template-indent-right-form .noOfDriver").css('display', 'block')
    } else {
        templateNoOfDriverElem.val('');
        $("#template-indent-right-form .noOfDriver").css('display', 'none')
    }
}


const addTemplateIndent = function () {
    let category = $('#template-indent-category-radio input[type="radio"]:checked').val()
    let resourceTypeId = templateResourceTypeElem.val()
    let resourceType = templateResourceTypeElem.find("option:selected").text()
    let serviceModeId = templateServiceModeElem.val()
    let serviceMode = templateServiceModeElem.find("option:selected").text()
    // let resource = category == 'Fuel' ? templateFuelResourceElem.val() : templateResourceElem.val()
    let resource = templateResourceElem.val()
    let noOfVehicle = templateNoOfVehicleElem.val()
    // let recurring = templateRecurringElem.val()
    let driver = templateDriverElem.prop('checked')
    let noOfDriver = templateNoOfDriverElem.val()
    // let litres = templateLitresElem.val()

    let data = {
        category, resourceTypeId, resourceType, serviceModeId, serviceMode, resource, noOfVehicle,  driver, noOfDriver
    }
    console.log(data);
    if (!ValidTemplateIndentForm(data)) return

    templateList.push(data)
    AddTemplateHtml()
}

const ValidTemplateIndentForm = function (data) {
    let errorLabel = {
        category: 'Category',
        resourceTypeId: 'Resource Type',
        serviceModeId: 'Service Mode',
        resource: 'Resource',
        noOfVehicle: 'No. Of Resource',
        noOfDriver: 'No. Of Driver',
    }
    if (data.category == 'CV' || data.category == 'MV') {
        let keyList = ['category', 'resourceTypeId', 'serviceModeId', 'resource']
        for (let key in data) {
            if (data[key] == "" && keyList.indexOf(key) != -1) {
                simplyAlert(errorLabel[key] + " is required.")
                return false
            }
            if (data[key] == "" && key == 'noOfVehicle' && data.resource != "-") {
                simplyAlert(errorLabel[key] + " is required.")
                return false
            }
            if (key == 'noOfDriver' && data.driver) {
                if (data[key] == "") {
                    simplyAlert(errorLabel[key] + " is required.")
                    return false
                } else if (data.noOfVehicle != '' && data.resource != "-" && (Number(data[key]) > Number(data.noOfVehicle))) {
                    simplyAlert("No. Of Driver cannot exceed No. Of Vehicle.")
                    return false
                }
            }
        }
    } 
    // else if (data.category == 'Fuel') {
    //     let keyList = ['category', 'resourceTypeId', 'resource', 'litres']
    //     for (let key in data) {
    //         if (data[key] == "" && keyList.indexOf(key) != -1) {
    //             simplyAlert(errorLabel[key] + " is required.")
    //             return false
    //         }
    //     }
    // } 
    else {
        simplyAlert("Category is required.")
        return false
    }
    return true
}

const AddTemplateHtml = function () {
    let html = templateList.map(o => {
        // let content = `${o.category}, ${o.resourceType}, ${o.resource}, ${o.litres}`
        // if (o.category != 'Fuel') {
        //     content = `${o.category}, ${o.resourceType}, ${o.serviceMode}, ${o.resource}, ${o.noOfVehicle}, ${o.driver ? o.noOfDriver + ' (Driver)' : 'No Driver'}`
        // }
        let content = `${o.category}, ${o.resourceType}, ${o.serviceMode}, ${o.resource}, ${o.noOfVehicle}, ${o.driver ? o.noOfDriver + ' (Driver)' : 'No Driver'}`
        return `<li class="list-group-item d-flex justify-content-between align-items-start">
                    <div class="ms-2 me-auto">${content}</div>
                    <button type="button" class="btn-close" aria-label="Close" onclick="deleteTemplateIndentRow(this)"></button>
                </li>`
    }).join('')
    $("#template-indent-left-form .list-group").html(html)
    cleanTemplateIndent()
}

const deleteTemplateIndentRow = function (e) {
    let index = $(e).closest('li').index()
    console.log(index);
    templateList.splice(index, 1);
    AddTemplateHtml()
}

const createTemplateIndent = async function () {
    let name = $("#templateIndentName").val()
    if (name == '') {
        simplyAlert('Template Indent Name is required!')
        return
    }
    if (templateList.length == 0) {
        simplyAlert('Please add Template Indent!')
        return
    }

    await axios.post("/createTemplateIndent", { templateList, name }).then(res => {
        if (res.data.code == 0) {
            simplyAlert(res.data.msg)
            return
        } else {
            $("#templateIndentModal").modal('hide')
            simplyAlert('Create Template Indent Success.')
        }
    })
}