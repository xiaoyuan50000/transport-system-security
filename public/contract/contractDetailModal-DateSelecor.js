let formatDate = 'DD/MM/YYYY'
    let startDate = $("#contract-start-date").text()
    let endDate = $("#contract-end-date").text()
    let extensionDate = $("#contract-extension-date").text()
    if(extensionDate){
        endDate = extensionDate
    }
    if(startDate){
        $("#contract-start-date").text(moment(startDate).format(formatDate))
    }
    if(endDate){
        $("#contract-end-date").text(moment(endDate).format(formatDate))
    }
    if(extensionDate){
        $("#contract-extension-date").text(moment(extensionDate).format(formatDate))
    }
    let startDateElem = "#contract-detial-start-date"
    let endDateElem = "#contract-detial-end-date"
    $(function(){
        InitStartDateSelectorModal()
        InitEndDateSelectorModal()
    })

    const InitStartDateSelectorModal = function () {
        layui.use(['laydate'], function () {
            laydate = layui.laydate;
            laydate.render({
                elem: startDateElem,
                lang: 'en',
                type: 'date',
                trigger: 'click',
                format: 'dd/MM/yyyy',
                //format: 'yyyy-MM-dd',
                btns: ['clear', 'confirm'],
                holidays: [top.publidHolidays],
                min: startDate,
                max: endDate,
                done: (value) => {
                    value = top.changeDateFormat(value)
                    let endDateElemValue = top.changeDateFormat($(endDateElem).val())
                    if (endDateElemValue && moment(endDateElemValue).isBefore(moment(value))) {
                        $.alert({
                            title: 'Warn!',
                            content: 'End Date should be later than Start Date!',
                        });
                        $(startDateElem).val(null)
                    }
                }
            });
        });
    }
    
    const InitEndDateSelectorModal = function () {
        layui.use(['laydate'], function () {
            laydate = layui.laydate;
            laydate.render({
                elem: endDateElem,
                lang: 'en',
                type: 'date',
                trigger: 'click',
                format: 'dd/MM/yyyy',
                //format: 'yyyy-MM-dd',
                btns: ['clear', 'confirm'],
                holidays: [top.publidHolidays],
                min: startDate,
                max: endDate,
                done: (value) => {
                    value = top.changeDateFormat(value)
                    let startDateElemValue = top.changeDateFormat($(startDateElem).val())
                    if (startDateElemValue && moment(startDateElemValue).isAfter(moment(value))) {
                        $.alert({
                            title: 'Warn!',
                            content: 'End Date should be later than Start Date!',
                        });
                        $(endDateElem).val(null)
                    }
                }
            });
        });
    }