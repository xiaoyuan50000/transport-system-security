const randomRangeNumber = function () {
    let minNumber = 10000
    let range = 99999 - minNumber;
    let random = Math.random();
    return minNumber + Math.round(random * range)
}

module.exports.VehicleJSON = function () {
    return {
        "vehicle": {
            "id": randomRangeNumber(),
            "guid": "VH0040000074",
            "plate_number": "YL 4568 T",
            "status": "available",
            "cargo_load": 3000.0,
            "model": "MITSUBISHI",
            "category": "40FT",
            "ownership_date": "2015-01-01",
            "registration_date": "2014-01-01",
            "insurance_expiry": "2016-01-01",
            "tax_expiry": "2016-01-01",
            "speed": 20.0,
            "volume": null,
            "custom_fields": [],
            "skills": [],
            "vehicle_parts": []
        }
    }
}      