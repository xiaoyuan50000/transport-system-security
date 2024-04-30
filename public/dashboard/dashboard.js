const YEAR = 3
        const purposeColor = ['#FAE032', '#1AA9AF', '#F55A53', '#A9D51A']
        $(function () {
            InitSelectOption()
            AddChangeEvent()

            GetContractBalance()
            //InitColumnChart('container-expenditure-month', ['#A9D52A', '#228DC6', '#E3747A'])
            //InitColumnChart('container-expenditure-type', ['#A9D52A', '#228DC6', '#E3747A'])
            //InitColumnChart('container-expenditure-surcharge', ['#A9D52A', '#228DC6', '#E3747A'])

            //InitColumnChart('container-fulfilment-bus-company', ['#A9D52A', '#228DC6', '#E3747A'])
            //InitColumnChart('container-fulfilment-contract', ['#A9D52A', '#228DC6', '#E3747A'])

            //InitColumnChart('container-late-indents', ['#A9D52A', '#228DC6', '#E3747A'], ['Jan', 'Feb', 'Mar'], [{ data: [1, 2, 3] }])
            //InitColumnChart('container-late-amendment', ['#A9D52A', '#228DC6', '#E3747A'])
            //InitColumnChart('container-bus-adjusted', ['#A9D52A', '#228DC6', '#E3747A'])

            //InitPieChart('container-expenditure-contracts', ['#D1E347', '#228DC6', '#E3747A'])
            //InitPieChart("container-yet-to-fulfil-purpose", ['#FAE032', '#1AA9AF', '#F55A53'])
            //InitPieChart("container-fulfilment-purpose", ['#A9D52A', '#D3215D', '#E3747A'])
            //InitPieChart("container-near-miss", ['#FAE032', '#1AA9AF', '#F55A53'])
            //InitPieChart("container-incident", ['#A9D52A', '#D3215D', '#E3747A'])
            
        })
        
        const InitPieChart = function (id, colors, datas) {
            let chart = Highcharts.chart(id, {
                chart: {
                    spacing: [0, 0, 0, 0]
                },
                credits: {
                    enabled: false
                },
                title: {
                    floating: true,
                    text: ''
                },
                tooltip: {
                    headerFormat: '<span style="font-size:16px">{point.key}: </span>',
                    pointFormat: '<span style="font-size:16px">{point.y} ({point.percentage:.1f}%)</span>',
                    useHTML: true
                },
                colors: colors,
                plotOptions: {
                    pie: {
                        dataLabels: {
                            enabled: true,
                            distance: -20,
                            style: {
                                fontWeight: 'bold',
                                color: 'white',
                                textShadow: '0px 1px 2px black'
                            }
                        },
                    }
                },
                /*series: [{
                    type: 'pie',
                    innerSize: '40%',
                    data: [
                        { name: 45, y: 45 },
                        { name: 12.8, y: 12.8, },
                        { name: 0, y: 0, },
                    ]
                }]*/
                series: [{
                    type: 'pie',
                    innerSize: '40%',
                    data: datas
                }]
            });
            $("#"+id).parent().unbind('click').on('click', function(e){
                e.currentTarget.classList.toggle('container-modal');
                chart.reflow();
            })
        }
       
        const InitColumnChart = function (id, colors, categories, datas) {
            let chart = Highcharts.chart(id, {
                chart: {
                    type: 'column',
                    
                },
                credits: {
                    enabled: false
                },
                legend: {
                    enabled: false
                },
                title: {
                    text: ''
                },
                xAxis: {
                    /*categories: [
                        'Jan', 'Feb', 'Mar'
                    ],*/
                    categories: categories,
                    crosshair: true
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: ''
                    }
                },
                colors: colors,
                tooltip: {
                    headerFormat: '<span style="font-size:16px">{point.key}</span><table style="font-size:16px">',
                    pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                        '<td style="padding:0"><b>{point.y}</b></td></tr>',
                    footerFormat: '</table>',
                    shared: true,
                    useHTML: true
                },
                plotOptions: {
                    column: {
                        borderWidth: 0
                    },
                },
                
                /*series: [{
                    name: 'Unit A',
                    data: [49.9, 71.5, 106.4]
                }, {
                    name: 'Unit B',
                    data: [83.6, 78.8, 98.5]
                }, {
                    name: 'Unit C',
                    data: [48.9, 38.8, 39.3]
                }, {
                    name: 'Unit D',
                    data: [42.4, 33.2, 34.5]
                }]*/
                series: datas
            });
            $("#"+id).parent().unbind('click').on('click', function(e){
                e.currentTarget.classList.toggle('container-modal');
                chart.reflow();
            })
        }
        

        const InitSelectOption = function () {
            const InitMonth = function () {
                let option = `<option value="">All</option>`
                for (let i = 1; i <= 12; i++) {
                    option += `<option value="${i}">${i}</option>`
                }
                $("#month-select").html(option)
            }
            const InitYear = function () {
                let currentYear = Number(moment().format("YYYY"))
                let years = []
                for (let i = currentYear; i > currentYear - YEAR; i--) {
                    years.push(i)
                }
                let option = `<option value="">All</option>`
                option += years.map(a => {
                    return `<option value="${a}">${a}</option>`
                }).join('')
                $("#year-select").html(option)
            }

            InitMonth()
            InitYear()
        }

        const AddChangeEvent = function () {
            $("#unit-select, #tsp-select, #month-select, #year-select").bind('change', function () {
                GetContractBalance()
            })
        }

        const GetRequestBody = function () {
            return {
                unit: $("#unit-select").val(),
                tsp: $("#tsp-select").val(),
                month: $("#month-select").val(),
                year: $("#year-select").val(),
            }
        }

        const GetContractBalance = function () {
            let body = GetRequestBody()
            axios.post('/getDashboardDatas', body).then(res => {
                let data = res.data.data
                $("#contract-balance").text(data.contractBalance)
                let categories = data.dashboardDatas.categories
                let totalExpenditureByMonth = data.dashboardDatas.totalExpenditureMonthDatas
                let totalExpenditureSurchargeDatas = data.dashboardDatas.totalExpenditureSurchargeDatas
                InitColumnChart('container-expenditure-month', ['#A9D52A', '#228DC6', '#E3747A'], categories, totalExpenditureByMonth)
                InitColumnChart('container-expenditure-surcharge', ['#A9D52A', '#228DC6', '#E3747A'], categories, totalExpenditureSurchargeDatas)

                let totalExpenditureByPurpose = data.totalExpenditureByPurpose
                InitColumnChart('container-expenditure-purpose', purposeColor, totalExpenditureByPurpose.categories, totalExpenditureByPurpose.datas)

                let totalExpenditureByContract = data.totalExpenditureByContract
                InitPieChart('container-expenditure-contracts', ['#D1E347', '#228DC6', '#E3747A'], totalExpenditureByContract)
                
                $("#container-expenditure-contracts-info").remove()
                $("#container-expenditure-contracts .highcharts-container").append(`<div id="container-expenditure-contracts-info"></div>`)
                let html = totalExpenditureByContract.map(o=> {
                    return `<div class="mb-2 d-flex">
                        <div><span>${o.name}:</span></div>
                        <div class="ms-2"><span>${o.y}</span></div>
                    </div>`
                }).join("")
                $("#container-expenditure-contracts-info").html(top.DOMPurify.sanitize(html))

                let yetToFulfilDatas = data.yetToFulfilDatas
                $("#yet-to-fulfil-total-buses").text(yetToFulfilDatas.totalBuses)
                $("#yet-to-fulfil-total-indents").text(yetToFulfilDatas.totalIndents)
                $("#yet-to-fulfil-incur-surcharge").text(yetToFulfilDatas.totalBusIncurSurcharge)
                $("#yet-to-fulfil-incur-surcharge-pct").text(yetToFulfilDatas.totalBusIncurSurchargePct)
                $("#yet-to-fulfil-from-units").text(yetToFulfilDatas.totalBusFromUnits)
                $("#yet-to-fulfil-from-units-pct").text(yetToFulfilDatas.totalBusFromUnitsPct)
                InitPieChart("container-yet-to-fulfil-purpose", purposeColor, yetToFulfilDatas.purposePieChartData)
                yetToFulfilDatas.purposePieChartData.forEach(item=>{
                    if(item.name=="Exercise"){
                        $("#yet-to-fulfil-exercise").text(item.y)
                    }else if(item.name=="Ops"){
                        $("#yet-to-fulfil-ops").text(item.y)
                    }else if(item.name=="Admin"){
                        $("#yet-to-fulfil-admin").text(item.y)
                    }else if(item.name=="Training"){
                        $("#yet-to-fulfil-training").text(item.y)
                    }
                })

                let fulfilmentDatas = data.fulfilmentDatas
                $("#fulfilment-total-buses").text(fulfilmentDatas.totalBuses)
                $("#fulfilment-total-indents").text(fulfilmentDatas.totalIndents)
                $("#fulfilment-late-arrival").text(fulfilmentDatas.totalLateArrivalBus)
                $("#fulfilment-late-arrival-pct").text(fulfilmentDatas.totalLateArrivalBusPct)
                //$("#fulfilment-noshow").text(fulfilmentDatas.totalnoShowBus)
                //$("#fulfilment-noshow-pct").text(fulfilmentDatas.totalnoShowBusPct)
                InitPieChart("container-fulfilment-purpose", purposeColor, fulfilmentDatas.purposePieChartData)
                InitColumnChart("container-fulfilment-bus-company", ['#FAE032', '#1AA9AF', '#F55A53'], fulfilmentDatas.tspFulfilment.categories, fulfilmentDatas.tspFulfilment.datas)
                InitColumnChart("container-fulfilment-contract", ['#FAE032', '#1AA9AF', '#F55A53'], fulfilmentDatas.contractFulfilment.categories, fulfilmentDatas.contractFulfilment.datas)
                fulfilmentDatas.purposePieChartData.forEach(item=>{
                    if(item.name=="Exercise"){
                        $("#fulfilment-exercise").text(item.y)
                    }else if(item.name=="Ops"){
                        $("#fulfilment-ops").text(item.y)
                    }else if(item.name=="Admin"){
                        $("#fulfilment-admin").text(item.y)
                    }else if(item.name=="Training"){
                        $("#fulfilment-training").text(item.y)
                    }
                })

                let userPerformanceDatas = data.userPerformanceDatas
                $("#performance-late-indent").text(userPerformanceDatas.totalResourceWithLateIndentSurcharge)
                $("#performance-late-indent-pct").text(userPerformanceDatas.totalResourceWithLateIndentSurchargePct)
                $("#performance-noshow-indent").text(userPerformanceDatas.totalResourceWithNoShowIndentSurcharge)
                $("#performance-noshow-indent-pct").text(userPerformanceDatas.totalResourceWithNoShowIndentSurchargePct)
                $("#performance-late-amendment").text(userPerformanceDatas.totalResourceWithLateAmendmentSurcharge)
                $("#performance-late-amendment-pct").text(userPerformanceDatas.totalResourceWithLateAmendmentSurchargePct)
                let performanceChart = userPerformanceDatas.performanceChart
                InitColumnChart('container-late-indents', ['#A9D52A', '#228DC6', '#E3747A'], performanceChart.categories, performanceChart.lateIndentsChart)
                InitColumnChart('container-bus-amended', ['#A9D52A', '#228DC6', '#E3747A'], performanceChart.categories, performanceChart.amentmentIndentsChart)
                InitColumnChart('container-bus-cancellation', ['#A9D52A', '#228DC6', '#E3747A'], performanceChart.categories, performanceChart.cancelledIndentsChart)

                /*let feedBackDatas = data.feedBackDatas
                $("#feedback-total-buses").text(feedBackDatas.totalNearMiss)
                $("#feedback-total-incidents").text(feedBackDatas.totalIncident)
                InitPieChart("container-near-miss", ['#FAE032', '#1AA9AF', '#F55A53'], feedBackDatas.nearMissPie)
                InitPieChart("container-incident", ['#FAE032', '#1AA9AF', '#F55A53'], feedBackDatas.incidentPie)*/
            })
        }