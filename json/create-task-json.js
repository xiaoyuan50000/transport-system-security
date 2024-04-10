module.exports.CreateTaskJson = {
    "task_attributes": {
        "job_id": 66173,
        "price": 20,
        "invoice_number": "IN12345678",
        "tracking_id": "Thisisauniquenumber003",
        "time_from": "2018-06-16T00:00:00.000+08:00",
        "time_to": "2018-06-16T23:59:00.000+08:00",
        "time_type": "all_day",
        "time_window_id": null,
        "expected_cod": 200,
        "remarks": "Leave with secretary",
        "service_time": 15,
        "address_attributes": {
            "name": "Someone's Home",
            "zip": 730877,
            "line_1": "877 WOODLANDS AVENUE 9",
            "line_2": "09-01",
            "country": "Singapore",
            "city": "Singapore City",
            "email": "her.email@domain.com",
            "contact_person": "Ms. Person",
            "contact_number": "+6523456789",
            "longitude": 103.791312,
            "latitude": 1.4451443
        },
        "measurements_attributes": [
            {
                "quantity": 3,
                "quantity_unit": "carton",
                "weight": 5,
                "volume": 0.5,
                "description": "Handphones",
                "custom_item_id": "Item12345",
                "custom_item_check_method": "manual",
                "custom_item_unload_check_method": "manual"
            },
            {
                "quantity": 1,
                "quantity_unit": "pallet",
                "weight": 10,
                "volume_length": 240,
                "volume_width": 240,
                "volume_height": 100,
                "description": "Cotton",
                "custom_item_id": "Item54321",
                "custom_item_check_method": "scanner",
                "custom_item_unload_check_method": "manual"
            }
        ],
        "custom_field_group_id": 57,
        "custom_fields_attributes": [
            {
                "custom_field_description_id": 374,
                "value": "abc"
            },
            {
                "value": "10",
                "subvalue": "A Option",
                "custom_field_description_id": 376
            }
        ],
        "tag_list": [
            "fragile",
            "urgent"
        ],
        "photos_attributes": [
            {
                "url": "example.com",
                "name": "example.png"
            }
        ],
        "vehicle_skill_list": [
            "skill_1",
            "skill_2"
        ],
        "vehicle_part_skill_list": [
            "skill_1",
            "skill_2"
        ],
        "driver_skill_list": [
            "skill_1",
            "skill_2"
        ]
    }
}

module.exports.TaskPinJson = {
    "task": {
        "id": 3394,
        "tracking_id": "TrackingID1234",
        "recipient_verification_pin": "2069"
    }
}