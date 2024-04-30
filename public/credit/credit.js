$(function () {
    initDashboard();
    initData();
});
const initDashboard = function () {
    Highcharts.chart('container1', {
        chart: {
            spacing : [0, 0, 0, 0],
            margin: [0, 0, 0, 0],
            height: 160,
        },
        credits: {
            enabled: false
        },
        title: {
            floating: true,
            text: '30%',
            style: { 'color': '#B6B5B5' },
        },
        tooltip: {
            enabled: false,
            pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
        },
        colors:['#21AEFF','#B6B5B5'],
        plotOptions: {
            pie: {
                borderWidth: 0,
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: false,
                    formatter: function () {
                        if (this.point.name === 'start') {
                            return '<span style="color:#73baff;">30%</span>';
                        }else if (this.point.name === 'other') {
                            return null;
                        }
                    },
                    style:{
                        color:'#B6B5B5',
                        fontSize:'12px',
                        textOutline:"none"
                    }
                },
            }
        },
        series: [{
            type: 'pie',
            innerSize: '75%',
            data: [
                {name: 'start', y: 30},
                {name: 'other', y: 100-30},
            ]
        }]
    }, function(c) {
        let centerY = c.series[0].center[1],
            titleHeight = parseInt(c.title.styles.fontSize);
        c.setTitle({
            y:centerY + titleHeight/2
        });
    });

    Highcharts.chart('container2', {
        chart: {
            spacing : [0, 0, 0, 0],
            margin: [0, 0, 0, 0],
            height: 160,
        },
        credits: {
            enabled: false
        },
        title: {
            floating: true,
            text: '35%',
            style: { 'color': '#B6B5B5' },
        },
        tooltip: {
            enabled: false,
            pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
        },
        colors:['#77D500','#B6B5B5'],
        plotOptions: {
            pie: {
                borderWidth: 0,
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: false,
                    formatter: function () {
                        if (this.point.name === 'start') {
                            return '<span style="color:#77D500;">30%</span>';
                        }else if (this.point.name === 'other') {
                            return null;
                        }
                    },
                    style:{
                        color:'#B6B5B5',
                        fontSize:'12px',
                        textOutline:"none"
                    }
                },
            }
        },
        series: [{
            type: 'pie',
            innerSize: '75%',
            data: [
                {name: 'start', y: 35},
                {name: 'other', y: 100-35},
            ]
        }]
    }, function(c) {
        let centerY = c.series[0].center[1],
            titleHeight = parseInt(c.title.styles.fontSize);
        c.setTitle({
            y:centerY + titleHeight/2
        });
    });

    Highcharts.chart('container3', {
        chart: {
            spacing : [0, 0, 0, 0],
            margin: [0, 0, 0, 0],
            height: 160,
        },
        credits: {
            enabled: false
        },
        title: {
            floating: true,
            text: '45%',
            style: { 'color': '#B6B5B5' },
        },
        tooltip: {
            enabled: false,
            pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
        },
        colors:['#FF941A','#B6B5B5'],
        plotOptions: {
            pie: {
                borderWidth: 0,
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: false,
                    formatter: function () {
                        if (this.point.name === 'start') {
                            return '<span style="color:#FF941A;">30%</span>';
                        }else if (this.point.name === 'other') {
                            return null;
                        }
                    },
                    style:{
                        color:'#B6B5B5',
                        fontSize:'12px',
                        textOutline:"none"
                    }
                },
            }
        },
        series: [{
            type: 'pie',
            innerSize: '75%',
            data: [
                {name: 'start', y: 45},
                {name: 'other', y: 100-45},
            ]
        }]
    }, function(c) {
        let centerY = c.series[0].center[1],
            titleHeight = parseInt(c.title.styles.fontSize);
        c.setTitle({
            y:centerY + titleHeight/2
        });
    });
};

function initData(){
    axios.post('../credit').then(res=>{
        console.log(res)
        let data = res.data.data;
        data.forEach(val =>{
            let html = `<div class="col-md-3 card-height">
            <div class="rounded shadow-sm bd-card mr-1">
                <div class="pl-2 pt-2 pb-2"><span class="font-weight-bold">Transport Provider ${val.id}</span></div>
                <div class="row pl-2">
                    <div class="col-md-12">
                        <ul>
                            <li>Pending</li>
                            <li>
                                <div class="progress">
                                    <div class="progress-bar bg-pending" role="progressbar" style="width: ${val.pending}%" aria-valuemin="0" aria-valuemax="100"></div>
                                </div>
                            </li>
                            <li><span class="pending-color">${val.pending}</span>/<span>${val.total}</span></li>
                        </ul>
                    </div>
                    <div class="col-md-12">
                        <ul>
                            <li>withhold</li>
                            <li>
                                <div class="progress">
                                    <div class="progress-bar bg-withhold" role="progressbar" style="width: ${val.withhold}%" aria-valuemin="0" aria-valuemax="100"></div>
                                </div>
                            </li>
                            <li><span class="withhold-color">${val.withhold}</span>/<span>${val.total}</span></li>
                        </ul>
                    </div>
                    <div class="col-md-12">
                        <ul>
                            <li>Bring on charge</li>
                            <li>
                                <div class="progress">
                                    <div class="progress-bar bg-charge" role="progressbar" style="width: ${val.charge}%" aria-valuemin="0" aria-valuemax="100"></div>
                                </div>
                            </li>
                            <li><span class="charge-color">${val.charge}</span>/<span>${val.total}</span></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>`
            $(".credit-foot").append(DOMPurify.sanitize(html))
        })
    })
}