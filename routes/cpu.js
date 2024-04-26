const express = require('express');
const router = express.Router();
require('express-async-errors');
let _os = require('os');

router.get('/usage', async (req, res) => {
    let cpuUsage = await CPUUtil.getProcessCpuUsage()
    let osCpuUsage = await CPUUtil.getOSCpuUsage()
    return res.json({ cpuUsage, osCpuUsage });
});

const CPUUtil = {

    getProcessCpuUsage: async () => {
        const startUsage = process.cpuUsage();
        await new Promise(resolve => setTimeout(resolve, 1000));
        const endUsage = process.cpuUsage();
        const cpuUsage = 100 * (endUsage.user - startUsage.user) / (1000000 + (endUsage.system - startUsage.system));
        return cpuUsage.toFixed(0)
    },

    getOSCpuUsage: async () => {
        return new Promise(resolve => {
            CPUUtil.cpuUsage(function (v) {
                resolve((v * 100).toFixed(0))
            })
        });
    },

    cpuUsage: function (callback) {
        CPUUtil.getCPUUsage(callback, false);
    },

    getCPUUsage: function (callback, free) {

        var stats1 = CPUUtil.getCPUInfo();
        var startIdle = stats1.idle;
        var startTotal = stats1.total;

        setTimeout(function () {
            var stats2 = CPUUtil.getCPUInfo();
            var endIdle = stats2.idle;
            var endTotal = stats2.total;

            var idle = endIdle - startIdle;
            var total = endTotal - startTotal;
            var perc = idle / total;

            if (free === true)
                callback(perc);
            else
                callback((1 - perc));

        }, 1000);
    },

    getCPUInfo: function (callback) {
        var cpus = _os.cpus();

        var user = 0;
        var nice = 0;
        var sys = 0;
        var idle = 0;
        var irq = 0;
        var total = 0;

        for (var cpu in cpus) {
            if (!cpus.hasOwnProperty(cpu)) continue;
            user += cpus[cpu].times.user;
            nice += cpus[cpu].times.nice;
            sys += cpus[cpu].times.sys;
            irq += cpus[cpu].times.irq;
            idle += cpus[cpu].times.idle;
        }

        var total = user + nice + sys + idle + irq;

        return {
            'idle': idle,
            'total': total
        };
    }
}

module.exports = router;