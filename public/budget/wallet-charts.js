const InitChart = function (wallet) {
    Highcharts.chart('wallet-container', {
        chart: {
            spacingRight: 150,
            height: 180,
        },
        credits: {
            enabled: false
        },
        title: {
            verticalAlign: 'middle',
            useHTML: true,
            text: `<div style="font-weight: bold; text-align: center;">
                <div style="color: #6C6C6C; font-size: 14px;">Actual</div>
                <div style="color: #000000;"><span>$ </span><span>${wallet.actual}</span></div>
            </div>`,
        },
        subtitle: {
            floating: true,
            align: 'right',
            x: 75,
            verticalAlign: 'middle',
            useHTML: true,
            text: `<div><div class="w-inline">
            <img class="w-img" src="../images/budget/down.svg">
            <span class="momey-income-color fw-bold">
                <span>$</span><span>${wallet.income}</span><br>
                <span class="font-sm">Income</span>
            </span>
        </div>
        <div class="w-inline mt-3">
            <img class="w-img" src="../images/budget/up.svg">
            <span class="momey-spent-color fw-bold">
                <span>$</span><span>${wallet.spent}</span><br>
                <span class="font-sm">Spent</span>
            </span>
        </div></div>`,
        },
        tooltip: {
            enabled: false,
            pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
        },
        colors: ['#1a8d4a', '#fc7122'],
        plotOptions: {
            pie: {
                borderWidth: 0,
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: false,
                    formatter: function () {
                        if (this.point.name === 'income') {
                            return '<span style="color:#1a8d4a;">30%</span>';
                        } else if (this.point.name === 'spent') {
                            return '<span style="color:#fc7122;">70%</span>';
                        }
                    },
                    style: {
                        fontSize: '12px',
                        textOutline: "none"
                    }
                },
            }
        },
        series: [{
            type: 'pie',
            innerSize: '85%',
            data: [
                { name: 'income', y: wallet.income },
                { name: 'spent', y: wallet.spent },
            ]
        }]
    });
}