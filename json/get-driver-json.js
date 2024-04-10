const randomRangeNumber = function () {
    let minNumber = 10000
    let range = 99999 - minNumber;
    let random = Math.random();
    return minNumber + Math.round(random * range)
  }

module.exports.DriverJSON = function(){
    return {
        "driver": {
            "id": randomRangeNumber(),
            "guid": "DR1120000001",
            "name": "Team" + randomRangeNumber(),
            "dob": "1990-12-13",
            "nric": "S92" + randomRangeNumber(),
            "contact_number": "12345678",
            "license": "S12312335E",
            "status": "Assigned",
            "archived": false,
            "is_versadrive_user": true,
            "username": "Driver122",
            "has_password": true,
            "is_attendant": false,
            "last_seen": {
                "latitude": 1.3305365,
                "longitude": 103.7218011,
                "time": "2020-05-05T15:58:48.133+08:00"
            },
            "default_vehicle": {
                "id": 58,
                "guid": "VH0040000058",
                "plate_number": "GBC 5649 G",
                "status": "available",
                "cargo_load": 12340.0,
                "model": "MITSUBISHI",
                "category": "40FT",
                "ownership_date": "2015-01-01",
                "registration_date": "2014-01-01",
                "insurance_expiry": "2016-01-01",
                "tax_expiry": "2016-01-01",
                "speed": 20.0,
                "custom_fields": [],
                "skills": [],
                "vehicle_parts": []
            },
            "address": {
                "id": 24,
                "name": "Test Driver 1 Address",
                "zip": "123456",
                "line_1": "Driver Rd",
                "line_2": "#02-123",
                "country": "Singapore",
                "city": "Singapore City",
                "email": "driver@email.com",
                "contact_person": "Bob",
                "contact_number": "91234567",
                "longitude": 53.1,
                "latitude": 12.23
            },
            "attendant": null,
            "driver": null,
            "custom_fields": [{
                "id": 2031919,
                "value": null,
                "subvalue": null,
                "custom_field_description_id": 439
            }],
            "skills": [{
                "name": "handsome"
            },
            {
                "name": "Super"
            }]
        }
    }
} 