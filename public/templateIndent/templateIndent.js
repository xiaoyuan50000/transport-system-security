let table
        let templateResourceTypeElem = $("#template-indent-right-form select[name='serviceType']")
        let templateServiceModeElem = $("#template-indent-right-form select[name='serviceMode']")
        let templateResourceElem = $("#template-indent-right-form select[name='typeOfVehicle']")
        let templateNoOfVehicleElem = $("#template-indent-right-form input[name='noOfVehicle']")
        let templateDriverElem = $("#template-indent-right-form input[name='driver']")
        let templateNoOfDriverElem = $("#template-indent-right-form input[name='noOfDriver']")
        let templateIndentServiceTypeList = []
        let currentSelectedId = null
        $(function () {
            InitFilterData()
            InitTemplateModal()
            table = $('.template-indent-table').DataTable({
                "ordering": false,
                "searching": false,
                "paging": true,
                "autoWidth": false,
                "language": PageHelper.language(),
                "lengthMenu": PageHelper.lengthMenu(),
                "dom": PageHelper.dom(),
                "pageLength": PageHelper.pageLength(),
                "processing": true,
                "serverSide": true,
                "fixedHeader": true,
                "scrollX": "auto",
                "scrollCollapse": true,
                "destroy": true,
                "ajax": {
                    url: "/initTemplateIndent",
                    type: "POST",
                    data: function (d) {
                        let params = GetFilerParameters()
                        params.start = d.start
                        params.length = d.length
                        return params
                    },
                },

                "columns": [
                    {
                        "data": null, "title": "S/N",
                        "render": function (data, type, full, meta) {
                            return meta.row + 1 + meta.settings._iDisplayStart
                        }
                    },
                    {
                        "data": "name", "title": "Template Indent Name"
                    },
                    {
                        "data": "category", "title": "Category"
                    },
                    {
                        "data": "resourceType", "title": "Resource Type",
                    },
                    {
                        "data": "serviceMode", "title": "Service Mode"
                    },
                    {
                        "data": "resource", "title": "Resource"
                    },
                    {
                        "data": "noOfResource", "title": "No. Of Resource"
                    },
                    {
                        "data": "noOfDriver", "title": "No. Of Driver"
                    },
                    {
                        "data": "id", "title": "Action",
                        "render": function (data, type, full, meta) {
                            return `<button class="btn btn-sm me-1" data-bs-toggle="modal" data-bs-target="#editTemplateIndentModal" data-bs-row="${meta.row}"><img src="../images/indent/action/edit.svg"></button>`
                        }
                    },
                ]
            });
        })

        const InitFilterData = async function () {
            await axios.post("/getTypeOfVehicle", { serviceModeId: null }).then(res => {
                let vehicleTypeSelect = res.data.data
                $("#resource").empty();
                $("#resource").append(`<option value="">Resource: All</option>`)
                $("#resource").append(`<option value="-">-</option>`)
                for (let item of vehicleTypeSelect) {
                    $("#resource").append(`<option value="${item.typeOfVehicle}">${item.typeOfVehicle}</option>`)
                }
            })
        }

        const GetFilerParameters = function () {
            let templateName = $("#indent-filter input[name='templateName']").val()
            let category = $("#indent-filter select[name='category']").val()
            let resource = $("#indent-filter select[name='resource']").val()
            return {
                templateName, category, resource
            }
        }

        const FilterOnChange = function () {
            let len = $("#indent-filter input[name='templateName']").val().length
            if (len > 0 && len < 5) {
                return
            }
            table.ajax.reload(null, true)
        }

        const cleanFilterData = function () {
            $("#indent-filter input[name='templateName']").val('')
            $("#indent-filter select[name='category']").val('')
            $("#indent-filter select[name='resource']").val('')
            table.ajax.reload(null, true)
        }

        const InitTemplateModal = function () {
            let modal = document.getElementById('editTemplateIndentModal')
            modal.addEventListener('hidden.bs.modal', function (event) {
                cleanTemplateIndent()
                currentSelectedId = null
            })
            modal.addEventListener('show.bs.modal', async function (event) {
                let button = event.relatedTarget
                let rowIndex = button.getAttribute('data-bs-row')
                let row = table.row(rowIndex).data();
                let { groupId, category, resourceTypeId, serviceModeId, resource, noOfResource, noOfDriver, driver } = row
                currentSelectedId = row.id
                let modalTitle = modal.querySelector('.modal-title')
                modalTitle.textContent = 'Edit ' + row.name

                await InitCategory(groupId)
                $(`input[type=radio][value="${category}"]`).attr("checked", 'checked')
                initResourceType(category)
                templateResourceTypeElem.val(resourceTypeId)
                await initTemplateServiceMode(resourceTypeId)
                templateServiceModeElem.val(serviceModeId)
                await changeTemplateServiceMode(serviceModeId)
                templateResourceElem.val(resource)
                await changeTemplateResource(resource)
                if (resource != '-') {
                    templateNoOfVehicleElem.val(noOfResource)
                }
                templateDriverElem.prop('checked', driver)
                if (driver) {
                    $("#template-indent-right-form .noOfDriver").css('display', 'block')
                    templateNoOfDriverElem.val(noOfDriver)
                } else {
                    templateNoOfDriverElem.val('');
                    $("#template-indent-right-form .noOfDriver").css('display', 'none')
                }
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

            $("#editTemplateIndentModal #edit-btn").on('click', async function () {
                await saveTemplateIndent()
                $("#editTemplateIndentModal").modal('hide')
            })
        }

        const InitCategory = async function (groupId) {
            await axios.post("/getServiceTypeByGroupId", { selectedGroupId: groupId }).then(res => {
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
            initResourceType(category)
        }
        const initResourceType = function (category) {
            let filterServiceTypeList = templateIndentServiceTypeList.filter(item => item.category == category)
            templateResourceTypeElem.empty()
            let data = `<option value=""></option>`
            for (let item of filterServiceTypeList) {
                data += `<option value="${item.id}" data-category="${item.category}">${item.name}</option>`
            }
            templateResourceTypeElem.append(data)
            templateServiceModeElem.empty()

        }

        const cleanTemplateIndent = function () {
            templateResourceTypeElem.val('')
            templateServiceModeElem.val('')
            templateResourceElem.val('')
            templateNoOfVehicleElem.val('')
            templateNoOfDriverElem.val('')
            templateDriverElem.prop('checked', false)
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

        const InitVehicleType = async function (serviceModeId = null) {
            return await axios.post("/getTypeOfVehicle", { serviceModeId: serviceModeId }).then(res => {
                return res.data.data
            })
        }


        const saveTemplateIndent = async function () {
            let category = $('#template-indent-category-radio input[type="radio"]:checked').val()
            let resourceTypeId = templateResourceTypeElem.val()
            let resourceType = templateResourceTypeElem.find("option:selected").text()
            let serviceModeId = templateServiceModeElem.val()
            let serviceMode = templateServiceModeElem.find("option:selected").text()
            let resource = templateResourceElem.val()
            let noOfVehicle = templateNoOfVehicleElem.val()
            let driver = templateDriverElem.prop('checked')
            let noOfDriver = templateNoOfDriverElem.val()

            let data = {
                category, resourceTypeId, resourceType, serviceModeId, serviceMode, resource, noOfVehicle, driver, noOfDriver
            }
            data.id = currentSelectedId
            console.log(data);
            if (!ValidTemplateIndentForm(data)) return

            await axios.post("/editTemplateIndentById", data).then(res => {
                if (res.data.code == 0) {
                    simplyAlert('Edit Failed.')
                    return
                }
                simplyAlert('Edit Success.')
                table.ajax.reload(null, false)
            })
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
            else {
                simplyAlert("Category is required.")
                return false
            }
            return true
        }