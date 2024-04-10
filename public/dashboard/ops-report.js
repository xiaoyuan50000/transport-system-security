var blueColorList = ['#0A3179', '#2B539F', '#3D65B0', '#5B86D7', '#76A2F5']
        var brownColorList = ['#754206', '#986122', '#B9803D', '#DA9D58', '#F8B870']
        var platformColorList = ['#BD8BF8', '#91CC75', '#FAC858', '#EE6666', '#8CC1E3', '#FC8452', '#CA7056', '#CC9E3E', '#D2B99B', '#F0F0F0']
        var purposeColorList = ['#546FC6', '#73C0DE', '#EE6766', '#90A790']
        $(async function () {
            initPageSelect()
            await initChartPage($('#unit-select').val(), $('.range-date').val())
            await initLateAddIndentChart2($('#unit-select').val(), $('.range-date').val(), $('#most-select').val())
        });
        const initPageSelect = function () {
            const initLayDate = function () {
                layui.use('laydate', function(){
                    let laydate = layui.laydate;
                    laydate.render({
                        elem: '.range-date',
                        format: 'dd/MM/yyyy',
                        type: 'date',
                        lang: 'en',
                        trigger: 'click',
                        range: '~',
                        btns: ['clear', 'confirm'],
                        done: async function () {
                            await initChartPage($('#unit-select').val(), $('.range-date').val())
                            await initLateAddIndentChart2($('#unit-select').val(), $('.range-date').val(), $('#most-select').val())
                            closeLoading($('.lateIndentByGroup-chart'), $('.lateIndentByGroup-chart div'), $('.lateIndentByGroup-chart .loading'))
                            closeLoading($('.lateIndentByGroup-all-chart'), $('.lateIndentByGroup-all-chart div'), $('.lateIndentByGroup-all-chart .loading'))
                        }
                    }); 
                });
            }
            initLayDate()
            $('.range-date').val(`${ moment().format('DD/MM/YYYY') } ~ ${ moment(moment().add(6, 'day')).format('DD/MM/YYYY') }`)

            const initMon = function () {
                $('#most-select').empty();
                let monList = [
                    { name: 'Previous 1 months', value: 1 },
                    { name: 'Previous 3 months', value: 3 },
                    { name: 'Previous 6 months', value: 6 },
                    { name: 'Previous 12 months', value: 12 }
                ]
                // $('#most-select').append(`<option value=""></option>`)
                for(let item of monList){
                    $('#most-select').append(`<option value="${ item.value }">${ item.name }</option>`)
                }
            }
            initMon()

            $('.moneyServiceType2-div').hide()
            $('#unit-select').off('change').on('change', async function(){
                if($('#unit-select').val() == 'Non-Bus'){
                    $('.cancalLateIndent-div').hide()
                    $('.moneyServiceType1-div').hide()
                    $('.moneyServiceType2-div').show()
                } else {
                    $('.cancalLateIndent-div').show()
                    $('.moneyServiceType1-div').show()
                    $('.moneyServiceType2-div').hide()
                }
                await initChartPage($('#unit-select').val(), $('.range-date').val())
                await initLateAddIndentChart2($('#unit-select').val(), $('.range-date').val(), $('#most-select').val())
            })
            $('#most-select').off('change').on('change', async function(){
                await initLateAddIndentChart2($('#unit-select').val(), $('.range-date').val(), $('#most-select').val())
            })
        }
        
        const initLoading = function(chartElemt, divElemt){
            if(divElemt) divElemt.hide()
            if(chartElemt){
                chartElemt.css('display', 'flex')
                chartElemt.css('align-items', 'center')
                chartElemt.css('justify-content', 'center')
                chartElemt.append(`
                    <div class="loading">
                        <div class="loading__dot"></div>
                        <div class="loading__dot"></div>
                        <div class="loading__dot"></div>
                        <div class="loading__dot"></div>
                        <div class="loading__dot"></div>
                        <div class="loading__dot"></div>
                        <div class="loading__dot"></div>
                        <div class="loading__dot"></div>
                    </div>
                `)
            }
        }
        const closeLoading = function(chartElemt, divElemt, chartLoadingElemt){
            setTimeout(() => {
                if(chartLoadingElemt) chartLoadingElemt.remove();
                if(chartElemt){
                    chartElemt.remove('display')
                    chartElemt.remove('align-items')
                }
                if(divElemt) divElemt.show()
            }, 100)
        }
        
        const initChartPage = async function (dataType, currentDate) {
            initLoading($('.purposeTotal-chart'), $('.purposeTotal-chart div'))
            initLoading($('.purposeTotal-all-chart'), $('.purposeTotal-all-chart div'))
            initLoading($('.serviceTypeTotal-chart'), $('.serviceTypeTotal-chart div'))
            initLoading($('.serviceTypeTotal-all-chart'), $('.serviceTypeTotal-all-chart div'))
            initLoading($('.purposeTotalByGroup-chart'), $('.purposeTotalByGroup-chart div'))
            initLoading($('.purposeTotalByGroup-all-chart'), $('.purposeTotalByGroup-all-chart div'))
            initLoading($('.addLateIndentByGroup-chart'), $('.addLateIndentByGroup-chart div'))
            initLoading($('.addLateIndentByGroup-all-chart'), $('.addLateIndentByGroup-all-chart div'))
            initLoading($('.cancalLateIndent-chart'), $('.cancalLateIndent-chart div'))
            initLoading($('.cancalLateIndent-all-chart'), $('.cancalLateIndent-all-chart div'))
            initLoading($('.moneyServiceType1-chart'), $('.moneyServiceType1-chart div'))
            initLoading($('.moneyServiceType-all-chart'), $('.moneyServiceType-all-chart div'))
            initLoading($('.moneyServiceType2-chart'), $('.moneyServiceType2-chart div'))
            initLoading($('.moneyServiceType-all-chart'), $('.moneyServiceType-all-chart div'))
            initLoading($('.lateIndentByGroup-chart'), $('.lateIndentByGroup-chart div'))
            initLoading($('.lateIndentByGroup-all-chart'), $('.lateIndentByGroup-all-chart div'))
            // $('#loadingModal').modal('show')
            const initTotalPercentage = function(num, total){
                if(num <= 0 || total <= 0) return '0%'
                let percent = (num / total) * 100
                percent = parseInt(percent);
                if(percent < 1) percent = 0
                return percent + '%'
            }
            const initTotal = function(numArr){
                let total = 0;
                for (var i = 0; i < numArr.length; i++) {
                    total += Number(numArr[i]);
                }
                return total
            }

            const getTotalResourcesIndented = async function (dataType, currentDate) {
                return axios.post("/getTotalResourcesIndented", { dataType, currentDate }).then(async (res) => {
                    return res.data.data
                })
            }
            let totalIndentData = await getTotalResourcesIndented(dataType, currentDate);
            let totalIndent = totalIndentData.indentTotal.total;
            $('.total-resoures-indent').text(` ${ totalIndentData.indentTotalByApprover.total }/${ totalIndent }(${ initTotalPercentage(totalIndentData.indentTotalByApprover.total, totalIndent) })`)
            
            const getBreakdownByPurpose = async function (dataType, currentDate) {
                return axios.post("/getBreakdownByPurpose", { dataType, currentDate }).then(async (res) => {
                    return res.data.data
                })
            }
            const initPurposeChart = function (purposeDataList) {
                let totalPurpose = purposeDataList.map(item => item.value);
                let totalPurposeNum = initTotal(totalPurpose);
                let newPurposeDataList = [];
                let legenDataList = [];
                for (let index = 0; index < purposeDataList.length; index++) {
                    let seriesObj = {
                        name: purposeDataList[index].name,
                        value: purposeDataList[index].value
                    }
                    if(purposeDataList[index].value > 0){
                        seriesObj['label'] = {
                            formatter: `${ purposeDataList[index].value }\n ${ initTotalPercentage(purposeDataList[index].value, totalPurposeNum) }`
                        }
                    } else {
                        seriesObj['label'] = {
                            show: false
                        }
                        seriesObj['tooltip'] = {
                            show: false
                        }
                    }
                    legenDataList.push({
                        name: purposeDataList[index].name,
                        itemStyle: {
                            color: purposeColorList[index]
                        }
                    })
                    newPurposeDataList.push(seriesObj)
                }
                let newColor = purposeColorList
                if(totalPurposeNum < 1) {
                    newColor = '#E0E0E0'
                }
                let myChart = echarts.init(document.querySelector(`.purposeTotal-chart`));
                initLoading($('.purposeTotal-chart'), $('.purposeTotal-chart div'))
                let option = {
                    tooltip: {
                        trigger: 'item',
                        formatter: function (params) {
                            return `${ params.name }: ${ params.value } (${ initTotalPercentage(params.value, totalPurposeNum) })`
                        }
                    },
                    legend: {
                        orient: 'vertical',
                        bottom: 'bottom',
                        itemWidth: 15,
                        itemHeight: 15,
                        data: legenDataList
                    },
                    series: [
                        {
                            type: 'pie',
                            bottom: '40',
                            radius: ['40%', '65%'],
                            color: newColor,
                            data: newPurposeDataList
                        }
                    ]
                };
                myChart.setOption(option, true);
                closeLoading($('.purposeTotal-chart'), $('.purposeTotal-chart div'), $('.purposeTotal-chart .loading'))
                myChart.getZr().off('click')
                myChart.getZr().on('click', function(){
                    $('#purposeTotalModal').modal("show");
                    let myChart2 = echarts.init(document.querySelector(`.purposeTotal-all-chart`), null, { width: '500px' });
                    initLoading($('.purposeTotal-all-chart'), $('.purposeTotal-all-chart div'))
                    let option2 = {
                        tooltip: {
                            trigger: 'item',
                            formatter: function (params) {
                                return `${ params.name }: ${ params.value } (${ initTotalPercentage(params.value, totalPurposeNum) })`
                            }
                        },
                        legend: {
                            orient: 'vertical',
                            bottom: 'bottom',
                            itemWidth: 15,
                            itemHeight: 15,
                            data: legenDataList
                        },
                        series: [
                            {
                                type: 'pie',
                                bottom: '40',
                                radius: ['40%', '65%'],
                                color: newColor,
                                data: newPurposeDataList
                            }
                        ]
                    };
                    myChart2.setOption(option2, true);
                    closeLoading($('.purposeTotal-all-chart'), $('.purposeTotal-all-chart div'), $('.purposeTotal-all-chart .loading'))
                })
            }
            let purposeDataList = await getBreakdownByPurpose(dataType, currentDate)
            initPurposeChart(purposeDataList)

            const getUtilisationByPlatform = async function (dataType, currentDate) {
                return axios.post("/getUtilisationByPlatform", { dataType, currentDate }).then(async (res) => {
                    return res.data.data
                })
            }
            const initServiceTypeChart = function (serviceTypeDataList) {
                let totalService = serviceTypeDataList.map(item => item.total);
                let totalServiceNum = initTotal(totalService);
                let newServiceTypeDataList = [];
                let legenDataList = [];
                for (let index = 0; index < serviceTypeDataList.length; index++) {
                    let seriesObj = { 
                        name: (serviceTypeDataList[index].serviceName.substr(0, 3)).toLowerCase() == 'bus' ? serviceTypeDataList[index].serviceName.substr(5, serviceTypeDataList[index].serviceName.length) ? serviceTypeDataList[index].serviceName.substr(5, serviceTypeDataList[index].serviceName.length) : 'Other' : serviceTypeDataList[index].serviceName,
                        value: serviceTypeDataList[index].total
                    }
                    if(serviceTypeDataList[index].total > 0){
                        seriesObj['label'] = {
                            formatter: `${ serviceTypeDataList[index].total } \n ${ initTotalPercentage(serviceTypeDataList[index].total, totalServiceNum) }`
                        }
                    } else {
                        seriesObj['label'] = {
                            show: false
                        }
                        seriesObj['tooltip'] = {
                            show: false
                        }
                    }
                    newServiceTypeDataList.push(seriesObj)   
                    legenDataList.push({
                        name: seriesObj.name,
                        itemStyle: {
                            color: platformColorList[index]
                        }
                    })
                }
                let newColor = platformColorList
                if(totalServiceNum < 1) {
                    newColor = '#E0E0E0'
                }
                let myChart = echarts.init(document.querySelector(`.serviceTypeTotal-chart`));
                initLoading($('.serviceTypeTotal-chart'), $('.serviceTypeTotal-chart div'))
                let option = {
                    tooltip: {
                        trigger: 'item',
                        formatter: function (params) {
                            return `${ params.name }: ${ params.value } (${ initTotalPercentage(params.value, totalServiceNum) })`
                        }
                    },
                    grid: {
                        top: '10%'  
                    },
                    legend: {
                        data: legenDataList,
                        bottom: 'bottom',
                        itemWidth: 13,
                        itemHeight: 13,
                        textStyle: {
                            fontSize: 10
                        },
                        tooltip: {
                            show: true
                        },
                    },
                    series: [
                        {
                            type: 'pie',
                            center: ['50%', '36%'],
                            radius: ['35%', '50%'],
                            color: newColor,
                            data: newServiceTypeDataList
                        }
                    ]
                };
                myChart.setOption(option, true);
                closeLoading($('.serviceTypeTotal-chart'), $('.serviceTypeTotal-chart div'), $('.serviceTypeTotal-chart .loading'))
                myChart.getZr().off('click')
                myChart.getZr().on('click', function(){
                    $('#serviceTypeTotalModal').modal("show");
                    let myChart2 = echarts.init(document.querySelector(`.serviceTypeTotal-all-chart`), null, { 
                        width:  legenDataList.length * 80 > 500 ? legenDataList.length * 80 : 500
                    });
                    initLoading($('.serviceTypeTotal-all-chart'), $('.serviceTypeTotal-all-chart div'))
                    let option2 = {
                        tooltip: {
                            trigger: 'item',
                            formatter: function (params) {
                                return `${ params.name }: ${ params.value } (${ initTotalPercentage(params.value, totalServiceNum) })`
                            }
                        },
                        legend: {
                            data: legenDataList,
                            bottom: 'bottom',
                            itemWidth: 15,
                            itemHeight: 15,
                            tooltip: {
                                show: true
                            },
                        },
                        series: [
                            {
                                type: 'pie',
                                radius: ['35%', '50%'],
                                color: newColor,
                                data: newServiceTypeDataList
                            }
                        ]
                    };
                    myChart2.setOption(option2, true);
                    closeLoading($('.serviceTypeTotal-all-chart'), $('.serviceTypeTotal-all-chart div'), $('.serviceTypeTotal-all-chart .loading'))
                })
            }
            let newServiceTypeDataList = await getUtilisationByPlatform(dataType, currentDate)
            initServiceTypeChart(newServiceTypeDataList)

            const getMostResourcesIndentsByUnits = async function (dataType, currentDate) {
                return axios.post("/getMostResourcesIndentsByUnits", { dataType, currentDate }).then(async (res) => {
                    return res.data.data
                })
            }
            const initServiceTypeByGroupChart = function (serviceTypeDataByGroup) {
                const initChartData = function(serviceTypeDataByGroup){
                    let xAxisData = serviceTypeDataByGroup.map(obj => obj.groupName);
                    let totalData = serviceTypeDataByGroup.map(obj => obj.totalNum);
                    let seriesList = [];
                    let dataTotalList = [];
                    let purposeList = ['Training', 'Admin', 'Ops', 'Exercise'];
                    for (let index = 0; index < purposeList.length; index++) {
                        let seriesObj =  {
                            name: purposeList[index],
                            type: 'bar',
                            stack: 'total',
                            label: {
                                show: true,
                                normal: {
                                    show: true,
                                    formatter: function (params) {
                                        if (params.value > 0) {
                                            return params.value;
                                        } else {
                                            return '';
                                        }
                                    }
                                }
                            },
                            emphasis: {
                                focus: 'series'
                            },
                            color: purposeColorList[index],
                        }
                            
                        let dataList = [];
                        for(let xitem of xAxisData){
                            let newserviceTypeDataByGroup = serviceTypeDataByGroup.filter(obj => obj.groupName == xitem);
                            newserviceTypeDataByGroup = newserviceTypeDataByGroup[0]
                            let purposeDataList = newserviceTypeDataByGroup.dataList;
                            if(purposeDataList.length > 0) {
                                for(let pitem of purposeDataList){
                                    if(purposeList[index] == pitem.name) {
                                        dataList.push(pitem.value)
                                        dataTotalList.push(0)
                                    }
                                }
                            } else {
                                dataList.push(0)
                                dataTotalList.push(0)
                            }
                            
                        }
                        
                        seriesObj['data'] = dataList;
                        seriesList.push(seriesObj)
                    }
                    dataTotalList = dataTotalList.splice(0, dataTotalList.length / 4)
                    let seriesTotalObj = {
                        name: 'total',
                        type: 'bar',
                        stack: 'total',
                        label: {
                            show: true,
                            position:'top',
                            formatter:function (params) {
                                var index = params.dataIndex;
                                if (totalData[index] > 0) {
                                    return totalData[index];
                                } else {
                                    return '';
                                }
                            },   
                        },
                        emphasis: {
                            focus: 'series'
                        },
                        color: 'white',
                        data: dataTotalList
                    };
                    seriesList.push(seriesTotalObj)

                    return { xAxisData, seriesList }
                }
    
                let myChart = echarts.init(document.querySelector(`.purposeTotalByGroup-chart`));
                initLoading($('.purposeTotalByGroup-chart'), $('.purposeTotalByGroup-chart div'))
                let portionData = initChartData(serviceTypeDataByGroup.slice(0, 5))
                let option = {
                    tooltip: {
                        trigger: 'axis',
                        axisPointer: {
                            type: 'shadow' 
                        },
                        textStyle: {
                            align: 'left'  
                        },
                        formatter: function(params) {
                            let total = 0;
                            for(let item of params){
                                total += Number(item.data);
                            }
                            let htmlStr = `
                                <div>${ params[0].axisValue }</div>    
                            `
                            for(let item of params){
                                if(item.seriesName != 'total') {
                                    htmlStr += `                    
                                        <div style="margin: 10px 0 0;line-height:1;">
                                        <div style="margin: 0px 0 0;line-height:1;">
                                        <span style="display:inline-block;margin-right:4px;border-radius:4px;width:10px;height:10px;background-color:${ item.color };"></span>
                                        <span style="font-size:15px;color:#666;font-weight:400;margin-left:2px;">${ item.seriesName } - ${ Number(item.data) }</span>
                                        <div style="clear:both"></div></div>
                                        <div style="clear:both"></div></div>
                                        <div style="clear:both"></div></div>
                                        <div style="clear:both"></div></div>
                                        <div style="clear:both"></div>
                                        </div>
                                        `
                                }
                            }
                            return htmlStr;
                        }
                    },
                    xAxis: {
                        type: 'category',
                        data: portionData.xAxisData,
                        axisLabel: { 
                            show: true, 
                            interval: 0, 
                            rotate: -17, 
                            textStyle: { 
                                fontWeight: 600,
                                color: 'black'
                            } 
                        },
                    },
                    yAxis: {
                        type: 'value',
                    },
                    grid: {
                        left: '60px'
                    },
                    series: portionData.seriesList
                };
                myChart.setOption(option, true);
                closeLoading($('.purposeTotalByGroup-chart'), $('.purposeTotalByGroup-chart div'), $('.purposeTotalByGroup-chart .loading'))
                myChart.getZr().off('click')
                myChart.getZr().on('click', function (params) {
                    $('#purposeTotalByGroupModal').modal("show");
                    let newServiceTypeDataByGroup = serviceTypeDataByGroup.filter(item => item.totalNum > 0)
                    newServiceTypeDataByGroup = newServiceTypeDataByGroup.length > 0 ? newServiceTypeDataByGroup : []
                    let allData = initChartData(newServiceTypeDataByGroup)
                    var newChart = echarts.init(document.querySelector(`.purposeTotalByGroup-all-chart`), null, {
                        width: newServiceTypeDataByGroup.length * 90 > 300 ? newServiceTypeDataByGroup.length * 90 : 300
                    });
                    
                    initLoading($('.purposeTotalByGroup-all-chart'), $('.purposeTotalByGroup-all-chart div'))
                    let option2 = {
                        tooltip: {
                            trigger: 'axis',
                            axisPointer: {
                                type: 'shadow' 
                            },
                            textStyle: {
                                align: 'left'  
                            },
                            formatter: function(params) {
                                let total = 0;
                                for(let item of params){
                                    total += Number(item.data);
                                }
                                let htmlStr = `
                                    <div>${ params[0].axisValue }</div>    
                                `
                                for(let item of params){
                                    if(item.seriesName != 'total') {
                                        htmlStr += `                    
                                            <div style="margin: 10px 0 0;line-height:1;">
                                            <div style="margin: 0px 0 0;line-height:1;">
                                            <span style="display:inline-block;margin-right:4px;border-radius:4px;width:10px;height:10px;background-color:${ item.color };"></span>
                                            <span style="font-size:15px;color:#666;font-weight:400;margin-left:2px;">${ item.seriesName } - ${ Number(item.data) }</span>
                                            <div style="clear:both"></div></div>
                                            <div style="clear:both"></div></div>
                                            <div style="clear:both"></div></div>
                                            <div style="clear:both"></div></div>
                                            <div style="clear:both"></div>
                                            </div>
                                            `
                                    }    
                                }
                                return htmlStr;
                            }
                        },
                        grid: {
                            left: '100px',   
                            right: '100px'  
                        },
                        xAxis: {
                            type: 'category',
                            data: allData.xAxisData,
                            axisLabel: { 
                                show: true, 
                                interval: 0, 
                                rotate: -20, 
                                textStyle: { 
                                    fontWeight: 600,
                                    color: 'black'
                                } 
                            }
                        },
                        yAxis: {
                            type: 'value',
                        },
                        series: allData.seriesList
                    };
                    closeLoading($('.purposeTotalByGroup-all-chart'), $('.purposeTotalByGroup-all-chart div'), $('.purposeTotalByGroup-all-chart .loading'))
                    setTimeout(()=> {
                        newChart.setOption(option2, true);
                        newChart.resize({
                            width: newServiceTypeDataByGroup.length * 90 > 300 ? newServiceTypeDataByGroup.length * 90 : 300
                        });
                    }, 200)
                });
            
            }
            let serviceTypeDataByGroupList = await getMostResourcesIndentsByUnits(dataType, currentDate)
            initServiceTypeByGroupChart(serviceTypeDataByGroupList)

            const getLateCreatedIndentsByUnits = async function (dataType, currentDate) {
                return axios.post("/getLateCreatedIndentsByUnits", { dataType, currentDate }).then(async (res) => {
                    return res.data.data
                })
            }
            const initLateAddIndentChart = function (addlateIndentDataByGroup) {
                let xAxisData = addlateIndentDataByGroup.map(item => item.groupName)
                let seriesData = addlateIndentDataByGroup.map(item => item.total)
                let myChart = echarts.init(document.querySelector(`.addLateIndentByGroup-chart`));
                initLoading($('.addLateIndentByGroup-chart'), $('.addLateIndentByGroup-chart div'))
                let option = {
                    tooltip: {
                        trigger: 'item'
                    },
                    xAxis: [{
                        type: 'category',
                        data: xAxisData.slice(0, 5),
                        axisLabel: { 
                            show: true, 
                            interval: 0, 
                            rotate: -17, 
                            textStyle: { 
                                fontWeight: 600,
                                color: 'black'
                            } 
                        }
                    }],
                    yAxis: {
                        type: 'value'
                    },
                    grid: {
                        left: '60px'
                    },
                    series: [
                        {
                            data: seriesData.slice(0, 5),
                            type: 'bar',
                            label:{
                                show: true,
                                position: 'top',
                                color: '#1F5FD4',
                                fontWeight: 600,
                                formatter: function (params) {
                                    if (params.value > 0) {
                                        return params.value;
                                    } else {
                                        return '';
                                    }
                                }
                            },
                            itemStyle: {
                                color: function(params){
                                    return blueColorList[params.dataIndex % blueColorList.length]
                                }
                            }
                        }
                    ]
                };
                myChart.setOption(option, true);
                closeLoading($('.addLateIndentByGroup-chart'), $('.addLateIndentByGroup-chart div'), $('.addLateIndentByGroup-chart .loading'))
                myChart.getZr().off('click')
                myChart.getZr().on('click', function (params) {
                    $('#addLateIndentByGroupModal').modal("show");
                    let newAddlateIndentDataByGroup = addlateIndentDataByGroup.filter(item => item.total > 0);
                    newAddlateIndentDataByGroup = newAddlateIndentDataByGroup.length > 0 ? newAddlateIndentDataByGroup : [];
                    let xAxisData2 = newAddlateIndentDataByGroup.map(item => item.groupName)
                    let seriesData2 = newAddlateIndentDataByGroup.map(item => item.total)    
                    var newChart = echarts.init(document.querySelector(`.addLateIndentByGroup-all-chart`), null, {
                        width: newAddlateIndentDataByGroup.length * 90 > 300 ?  newAddlateIndentDataByGroup.length * 90 : 300
                    });
                    initLoading($('.addLateIndentByGroup-all-chart'), $('.addLateIndentByGroup-all-chart div'))
                    let option2 = {
                        tooltip: {
                            trigger: 'item'
                        },
                        grid: {
                            left: '100px',   
                            right: '100px'  
                        },
                        xAxis: [{
                            type: 'category',
                            data: xAxisData2,
                            axisLabel: { 
                                show: true, 
                                interval: 0, 
                                rotate: -20, 
                                textStyle: { 
                                    fontWeight: 600,
                                    color: 'black'
                                } 
                            }
                        }],
                        yAxis: {
                            type: 'value'
                        },
                        series: [
                            {
                                data: seriesData2,
                                type: 'bar',
                                label:{
                                    show: true,
                                    position: 'top',
                                    color: '#1F5FD4',
                                    fontWeight: 600,
                                    formatter: function (params) {
                                        if (params.value > 0) {
                                            return params.value;
                                        } else {
                                            return '';
                                        }
                                    }
                                },
                                itemStyle: {
                                    color: function(params){
                                        return blueColorList[params.dataIndex % blueColorList.length]
                                    }
                                }
                            }
                        ]
                    };
                    closeLoading($('.addLateIndentByGroup-all-chart'), $('.addLateIndentByGroup-all-chart div'), $('.addLateIndentByGroup-all-chart .loading'))
                    setTimeout(()=> {
                        newChart.setOption(option2, true);
                        newChart.resize({
                            width: newAddlateIndentDataByGroup.length * 90 > 300 ?  newAddlateIndentDataByGroup.length * 90 : 300
                        });
                    }, 200)
                });
            }
            let addlateIndentDataByGroup = await getLateCreatedIndentsByUnits(dataType, currentDate)
            initLateAddIndentChart(addlateIndentDataByGroup)

            const getMostLateCancellationByUnit = async function (dataType, currentDate) {
                return axios.post("/getMostLateCancellationByUnit", { dataType, currentDate }).then(async (res) => {
                    return res.data.data
                })
            }
            let cancellateIndentDataByGroup = await getMostLateCancellationByUnit(dataType, currentDate)
            const initLateCancellIndentChart = function (cancellateIndentDataByGroup) {
                let xAxisData = cancellateIndentDataByGroup.map(item => item.groupName)
                let seriesData = cancellateIndentDataByGroup.map(item => item.total)
                let myChart = echarts.init(document.querySelector(`.cancalLateIndent-chart`));
                initLoading($('.cancalLateIndent-chart'), $('.cancalLateIndent-chart div'))
                let option = {
                    tooltip: {
                        trigger: 'item'
                    },
                    grid: {
                        left: '50px'
                    },
                    xAxis: {
                        type: 'category',
                        data: xAxisData.slice(0, 5),
                        axisLabel: { 
                            show: true, 
                            interval: 0,
                            rotate: -17, 
                            textStyle: { 
                                fontWeight: 600,
                                color: 'black'
                            } 
                        }
                    },
                    yAxis: {
                        type: 'value'
                    },
                    series: [
                        {
                            data: seriesData.slice(0, 5),
                            type: 'bar',
                            label:{
                                show: true,
                                position: 'top',
                                formatter: function (params) {
                                    if (params.value > 0) {
                                        return params.value;
                                    } else {
                                        return '';
                                    }
                                }
                                
                            },
                            itemStyle: {
                                color: function(params){
                                    return brownColorList[params.dataIndex % brownColorList.length]
                                }
                            }
                        }
                    ]
                };
                myChart.setOption(option, true);
                closeLoading($('.cancalLateIndent-chart'), $('.cancalLateIndent-chart div'), $('.cancalLateIndent-chart .loading'))
                myChart.getZr().off('click')
                myChart.getZr().on('click', function (params) {
                    $('#cancalLateIndentModal').modal("show");
                    let newCancellateIndentDataByGroup = cancellateIndentDataByGroup.filter(item => item.total > 0);
                    newCancellateIndentDataByGroup = newCancellateIndentDataByGroup.length > 0 ? newCancellateIndentDataByGroup : [] 
                    let xAxisData2 = newCancellateIndentDataByGroup.map(item => item.groupName)
                    let seriesData2 = newCancellateIndentDataByGroup.map(item => item.total)
                    let newChart = echarts.init(document.querySelector(`.cancalLateIndent-all-chart`), null, {
                        width: newCancellateIndentDataByGroup.length * 90 > 300 ? newCancellateIndentDataByGroup.length * 90 : 300
                    });
                    initLoading($('.cancalLateIndent-all-chart'), $('.cancalLateIndent-all-chart div'))
                    let option2 = {
                        tooltip: {
                            trigger: 'item'
                        },
                        grid: {
                            left: '100px',   
                            right: '100px'  
                        },
                        xAxis: {
                            type: 'category',
                            data: xAxisData2,
                            axisLabel: { 
                                show: true, 
                                interval: 0,
                                rotate: -20, 
                                textStyle: { 
                                    fontWeight: 600,
                                    color: 'black'
                                } 
                            }
                        },
                        yAxis: {
                            type: 'value'
                        },
                        series: [
                            {
                                data: seriesData2,
                                type: 'bar',
                                label:{
                                    show: true,
                                    position: 'top',
                                    formatter: function (params) {
                                        if (params.value > 0) {
                                            return params.value;
                                        } else {
                                            return '';
                                        }
                                    }
                                    
                                },
                                itemStyle: {
                                    color: function(params){
                                        return brownColorList[params.dataIndex % brownColorList.length]
                                    }
                                }
                            }
                        ]
                    };
                    closeLoading($('.cancalLateIndent-all-chart'), $('.cancalLateIndent-all-chart div'), $('.cancalLateIndent-all-chart .loading'))
                    setTimeout(()=> {
                        newChart.setOption(option2, true);
                        newChart.resize({
                            width: newCancellateIndentDataByGroup.length * 90 > 300 ? newCancellateIndentDataByGroup.length * 90 : 300
                        });
                    }, 200)
                });
            }
            if($('#unit-select').val() != 'Non-Bus') initLateCancellIndentChart(cancellateIndentDataByGroup)

            const getExpenditureByPlatform = async function (dataType, currentDate) {
                return axios.post("/getExpenditureByPlatform", { dataType, currentDate }).then(async (res) => {
                    return res.data.data
                })
            }
            let moneyIndentDataByServiceType = await getExpenditureByPlatform(dataType, currentDate)
            const initPlatformExpenditureChart = function (moneyIndentDataByServiceType) {
                const getChartData = function (moneyIndentDataByServiceType){
                    let xAxisData = moneyIndentDataByServiceType.map(item => item.serviceName)
                    let totalData = moneyIndentDataByServiceType.map(item => item.total)
                    let seriesData = []
                    for (let index = 0; index < totalData.length; index++) {
                        seriesData.push(
                            {
                                value: totalData[index],
                                itemStyle: {
                                    color: platformColorList[index]
                                }
                            }
                        )
                    }
                    return { xAxisData, totalData, seriesData }
                }
                let myChart = echarts.init(document.querySelector(`.moneyServiceType1-chart`));
                initLoading($('.moneyServiceType1-chart'), $('.moneyServiceType1-chart div'))
                let chartData1 = getChartData(moneyIndentDataByServiceType);
                let option = {
                    tooltip: {
                        trigger: 'item'
                    },
                    grid: {
                        left: '40px'
                    },
                    xAxis: {
                        type: 'category',
                        data: chartData1.xAxisData,
                        axisLabel: {
                            show: true, 
                            interval: 0, 
                            rotate: -25, 
                            inside: false,
                            textStyle: { 
                                fontWeight: 600,
                                color: 'black',
                                fontSize: 9
                            } ,
                            formatter: function (params) {
                                params = (params.substr(0, 3)).toLowerCase() == 'bus' ? params.substr(5, params.length) ? params.substr(5, params.length) : 'Other' : params;
                                return params.length > 20 ? `${params.substr(0, 20)}...` : params;
                            },
                        },
                        tooltip: {
                                show: true
                        },
                    },
                    yAxis: [{
                        type: 'value',
                        alignTicks: true,
                        axisLabel: {
                            formatter: function(value, index){
                                let thousand = value;
                                if (value >= 1000) {
                                    thousand = value / 1000 + 'k';
                                } else {
                                    thousand = value
                                }
                                return '$'+thousand;

                            }
                        }
                    }],
                    series: [
                        {
                            data: chartData1.seriesData,
                            type: 'bar',
                            label:{
                                show: true,
                                position: 'top',
                                color: '#1F5FD4',
                                fontWeight: 600,
                                formatter: function (params) {
                                    if (params.value > 0) {
                                        let thousand = params.value;
                                        if (params.value >= 1000) {
                                            thousand = params.value / 1000 + 'k';
                                        } else {
                                            thousand = params.value
                                        }
                                        return '$'+thousand;
                                    } else {
                                        return '';
                                    }
                                }
                                
                            },
                            color: platformColorList
                        }
                    ]
                };
                myChart.setOption(option, true);
                closeLoading($('.moneyServiceType1-chart'), $('.moneyServiceType1-chart div'), $('.moneyServiceType1-chart .loading'))
                myChart.getZr().off('click')
                myChart.getZr().on('click', function (params) {
                    $('#moneyServiceTypeModal').modal("show");
                    let newMoneyIndentDataByServiceType = moneyIndentDataByServiceType.filter(item => item.total > 0);
                    newMoneyIndentDataByServiceType = newMoneyIndentDataByServiceType.length > 0 ? newMoneyIndentDataByServiceType : []
                    let chartData2 = getChartData(newMoneyIndentDataByServiceType);
                    let myChart2 = echarts.init(document.querySelector(`.moneyServiceType-all-chart`), null, {
                        width: newMoneyIndentDataByServiceType.length * 90 > 400 ? newMoneyIndentDataByServiceType.length * 90 : 400
                    });
                    initLoading($('.moneyServiceType-all-chart'), $('.moneyServiceType-all-chart div'))
                    let option2 = {
                        tooltip: {
                            trigger: 'item'
                        },
                        grid: {
                            left: '100px',   
                            right: '100px'  
                        },
                        xAxis: {
                            type: 'category',
                            data: chartData2.xAxisData,
                            axisLabel: {
                                show: true, 
                                interval: 0, 
                                rotate: -10, 
                                inside: false,
                                textStyle: { 
                                    fontWeight: 600,
                                    color: 'black',
                                    fontSize: 9
                                } ,
                                formatter: function (params) {
                                    params = (params.substr(0, 3)).toLowerCase() == 'bus' ? params.substr(5, params.length) ? params.substr(5, params.length) : 'Other' : params;
                                    return params;
                                },
                            },
                            tooltip: {
                                show: true
                            },
                        },
                        yAxis: [{
                            type: 'value',
                            alignTicks: true,
                            axisLabel: {
                                formatter: function(value, index){
                                    let thousand = value;
                                    if (value >= 1000) {
                                        thousand = value / 1000 + 'k';
                                    } else {
                                        thousand = value
                                    }
                                    return '$'+thousand;
                                }
                            }
                        }],
                        series: [
                            {
                                data: chartData2.seriesData,
                                type: 'bar',
                                label:{
                                    show: true,
                                    position: 'top',
                                    color: '#1F5FD4',
                                    fontWeight: 600,
                                    formatter: function (params) {
                                        if (params.value > 0) {
                                            let thousand = params.value;
                                            if (params.value >= 1000) {
                                                thousand = params.value / 1000 + 'k';
                                            } else {
                                                thousand = params.value
                                            }
                                            return '$'+thousand;
                                        } else {
                                            return '';
                                        }
                                    }
                                },
                                color: platformColorList
                            }
                        ]
                    };
                    closeLoading($('.moneyServiceType-all-chart'), $('.moneyServiceType-all-chart div'), $('.moneyServiceType-all-chart .loading'))
                    setTimeout(()=> {
                        myChart2.setOption(option2, true);
                        myChart2.resize({
                            width: newMoneyIndentDataByServiceType.length * 90 > 400 ? newMoneyIndentDataByServiceType.length * 90 : 400
                        });
                    }, 200)
                })
            }
            if($('#unit-select').val() != 'Non-Bus') initPlatformExpenditureChart(moneyIndentDataByServiceType)

            const initPlatformExpenditureChart2 = function (moneyIndentDataByServiceType) {
                const getChartData = function (moneyIndentDataByServiceType){
                    let xAxisData = moneyIndentDataByServiceType.map(item => item.serviceName)
                    let totalData = moneyIndentDataByServiceType.map(item => item.total)
                    let seriesData = []
                    for (let index = 0; index < totalData.length; index++) {
                        seriesData.push(
                            {
                                value: totalData[index],
                                itemStyle: {
                                    color: platformColorList[index]
                                }
                            }
                        )
                    }
                    return { xAxisData, totalData, seriesData }
                }
                let myChart = echarts.init(document.querySelector(`.moneyServiceType2-chart`));
                initLoading($('.moneyServiceType2-chart'), $('.moneyServiceType2-chart div'))
                let chartData1 = getChartData(moneyIndentDataByServiceType)
                let option = {
                    tooltip: {
                        trigger: 'item'
                    },
                    grid: {
                        left: '60px'
                    },
                    xAxis: {
                        type: 'category',
                        data: chartData1.xAxisData,
                        axisLabel: {
                            show: true, 
                            interval: 0, 
                            rotate: -15, 
                            inside: false,
                            textStyle: { 
                                fontWeight: 600,
                                fontSize: 10,
                                color: 'black'
                            } ,
                            // formatter: function (params) {
                            //     return params.length > 8 ? `${params.substr(0, 8)}\n${ params.substr(8, params.length) }` : params;
                            // }
                        }
                    },
                    yAxis: [{
                        type: 'value',
                        alignTicks: true,
                        axisLabel: {
                            formatter: function(value, index){
                                let thousand = value;
                                if (value >= 1000) {
                                    thousand = value / 1000 + 'k';
                                } else {
                                    thousand = value
                                }
                                return '$'+thousand;

                            }
                        }
                    }],
                    series: [
                        {
                            data: chartData1.seriesData,
                            type: 'bar',
                            label:{
                                show: true,
                                position: 'top',
                                color: '#1F5FD4',
                                fontWeight: 600,
                                formatter: function (params) {
                                    if (params.value > 0) {
                                        let thousand = params.value;
                                        if (params.value >= 1000) {
                                            thousand = params.value / 1000 + 'k';
                                        } else {
                                            thousand = params.value
                                        }
                                        return '$'+thousand;
                                    } else {
                                        return '';
                                    }
                                }
                                
                            }
                        }
                    ]
                };
                myChart.setOption(option, true);
                closeLoading($('.moneyServiceType2-chart'), $('.moneyServiceType2-chart div'), $('.moneyServiceType2-chart .loading'))
                myChart.getZr().off('click')
                myChart.getZr().on('click', function (params) {
                    $('#moneyServiceTypeModal').modal("show");
                    let newMoneyIndentDataByServiceType = moneyIndentDataByServiceType.filter(item => item.total > 0);
                    newMoneyIndentDataByServiceType = newMoneyIndentDataByServiceType.length > 0 ? newMoneyIndentDataByServiceType : []
                    let chartData2 = getChartData(newMoneyIndentDataByServiceType);
                    let myChart2 = echarts.init(document.querySelector(`.moneyServiceType-all-chart`), null, {
                        width: newMoneyIndentDataByServiceType.length * 90 > 400 ? newMoneyIndentDataByServiceType.length * 90 : 400
                    });
                    initLoading($('.moneyServiceType-all-chart'), $('.moneyServiceType-all-chart div'))
                    let option2 = {
                        tooltip: {
                            trigger: 'item'
                        },
                        grid: {
                            left: '100px',   
                            right: '100px'  
                        },
                        xAxis: {
                            type: 'category',
                            data: chartData2.xAxisData,
                            axisLabel: {
                                show: true, 
                                interval: 0, 
                                rotate: -15, 
                                inside: false,
                                textStyle: { 
                                    fontWeight: 600,
                                    fontSize: 10,
                                    color: 'black'
                                } ,
                                // formatter: function (params) {
                                //     return params.length > 8 ? `${params.substr(0, 8)}\n${ params.substr(8, params.length) }` : params;
                                // }
                            }
                        },
                        yAxis: [{
                            type: 'value',
                            alignTicks: true,
                            axisLabel: {
                                formatter: function(value, index){
                                    let thousand = value;
                                    if (value >= 1000) {
                                        thousand = value / 1000 + 'k';
                                    } else {
                                        thousand = value
                                    }
                                    return '$'+thousand;
                                }
                            }
                        }],
                        series: [
                            {
                                data: chartData2.seriesData,
                                type: 'bar',
                                label:{
                                    show: true,
                                    position: 'top',
                                    color: '#1F5FD4',
                                    fontWeight: 600,
                                    formatter: function (params) {
                                        if (params.value > 0) {
                                            let thousand = params.value;
                                            if (params.value >= 1000) {
                                                thousand = params.value / 1000 + 'k';
                                            } else {
                                                thousand = params.value
                                            }
                                            return '$'+thousand;
                                        } else {
                                            return '';
                                        }
                                    }
                                    
                                }
                            }
                        ]
                    };
                    closeLoading($('.moneyServiceType-all-chart'), $('.moneyServiceType-all-chart div'), $('.moneyServiceType-all-chart .loading'))    
                    setTimeout(()=> {
                        myChart2.setOption(option2, true);
                        myChart2.resize({
                            width: newMoneyIndentDataByServiceType.length * 90 > 400 ? newMoneyIndentDataByServiceType.length * 90 : 400
                        });
                    }, 200)
                   
                })
            }
            if($('#unit-select').val() == 'Non-Bus') initPlatformExpenditureChart2(moneyIndentDataByServiceType)
           
            let moneyIndentTotalList = moneyIndentDataByServiceType.map(item => item.total)
            let moneyIndentTotal = moneyIndentTotalList.reduce((accumulator, currentValue) => accumulator + currentValue);
            $('.total-money').text(`$${ moneyIndentTotal ?? 0 }`)

            const getActivityName = async function (dataType, currentDate) {
                return axios.post("/getActivityName", { dataType, currentDate }).then(async (res) => {
                    return res.data.data
                })
            }
            let activityNameData = await getActivityName(dataType, currentDate)
            let keyEventsName = activityNameData.join(',');
            $('.Key-Events').text(keyEventsName.length > 80 ? `${keyEventsName.substr(0, 80)}...` : keyEventsName)
            $('.Key-Events').off('click').on('click', function(){
                top.simplyAlert(`<div>${ keyEventsName }</div>`)
            })
        }

        const initLateAddIndentChart2 = async function (dataType, currentDate, monthDay) {
            const getAddlateIndentDataByGroup = async function (dataType, currentDate, monthDay) {
                return axios.post("/getAddlateIndentDataByGroup", { dataType, currentDate, monthDay }).then(async (res) => {
                    return res.data.data
                })
            }
            let mostlateIndentDataByGroup = await getAddlateIndentDataByGroup(dataType, currentDate, monthDay);
            
            let addlateIndentDataByGroup = mostlateIndentDataByGroup.mostIndent
            let xAxisData = addlateIndentDataByGroup.map(item => item.groupName)
            let seriesData = addlateIndentDataByGroup.map(item => item.total)
            
            let myChart = echarts.init(document.querySelector(`.lateIndentByGroup-chart`));
            initLoading($('.lateIndentByGroup-chart'), $('.lateIndentByGroup-chart div'))
            let option = {
                tooltip: {
                    trigger: 'item'
                },
                grid: {
                    left: '60px'
                },
                xAxis: {
                    type: 'category',
                    data: xAxisData.slice(0, 5),
                    axisLabel: { 
                        show: true, 
                        interval: 0,
                        textStyle: { 
                            fontWeight: 600,
                            color: 'black'
                        } 
                    }
                },
                yAxis: {
                    type: 'value'
                },
                series: [
                    {
                        data: seriesData.slice(0, 5),
                        type: 'bar',
                        label:{
                            show: true,
                            position: 'top',
                            top: 20,
                            color: '#1F5FD4',
                            fontWeight: 600,
                            formatter: function (params) {
                                if (params.value > 0) {
                                    return params.value;
                                } else {
                                    return '';
                                }
                            }
                        },
                        itemStyle: {
                            color: function(params){
                                return blueColorList[params.dataIndex % blueColorList.length]
                            }
                        }
                    }
                ]
            };
            myChart.setOption(option, true);
            closeLoading($('.lateIndentByGroup-chart'), $('.lateIndentByGroup-chart div'), $('.lateIndentByGroup-chart .loading'))
            myChart.getZr().off('click')
            myChart.getZr().on('click', function (params) {
                $('#lateIndentByGroupModal').modal("show");
                let newAddlateIndentDataByGroup = addlateIndentDataByGroup.filter(item => item.total > 0);
                newAddlateIndentDataByGroup = newAddlateIndentDataByGroup.length > 0 ? newAddlateIndentDataByGroup : []
                let xAxisData2 = newAddlateIndentDataByGroup.map(item => item.groupName)
                let seriesData2 = newAddlateIndentDataByGroup.map(item => item.total)
                let newChart = echarts.init(document.querySelector(`.lateIndentByGroup-all-chart`), null, {
                        width: newAddlateIndentDataByGroup.length * 90 > 300 ? newAddlateIndentDataByGroup.length * 90 : 300
                });
                initLoading($('.lateIndentByGroup-all-chart'), $('.lateIndentByGroup-all-chart div'))
                let option2 = {
                    tooltip: {
                        trigger: 'item'
                    },
                    grid: {
                        left: '100px',   
                        right: '100px'  
                    },
                    xAxis: [{
                        type: 'category',
                        data: xAxisData2,
                        axisLabel: { 
                            show: true, 
                            interval: 0, 
                            rotate: -20, 
                            textStyle: { 
                                fontWeight: 600,
                                color: 'black'
                            } 
                        }
                    }],
                    yAxis: {
                        type: 'value'
                    },
                    series: [
                        {
                            data: seriesData2,
                            type: 'bar',
                            label:{
                                show: true,
                                position: 'top',
                                color: '#1F5FD4',
                                fontWeight: 600,
                                formatter: function (params) {
                                    if (params.value > 0) {
                                        return params.value;
                                    } else {
                                        return '';
                                    }
                                }
                            },
                            itemStyle: {
                                color: function(params){
                                    return blueColorList[params.dataIndex % blueColorList.length]
                                }
                            }
                        }
                    ]
                };
                closeLoading($('.lateIndentByGroup-all-chart'), $('.lateIndentByGroup-all-chart div'), $('.lateIndentByGroup-all-chart .loading'))
                setTimeout(()=> {
                    newChart.setOption(option2, true);
                    newChart.resize({
                        width: newAddlateIndentDataByGroup.length * 90 > 300 ? newAddlateIndentDataByGroup.length * 90 : 300
                    });
                }, 200)
            });
            $('.range-date2').text(mostlateIndentDataByGroup.dataRage)
        }