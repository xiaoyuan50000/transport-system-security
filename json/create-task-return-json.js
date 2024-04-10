module.exports.CreateTaskReturnJson = {
  "task": {
    "id": 238402,
    "guid": "TA2600238402",
    "account_created_id": 319,
    "account_id": 4546,
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
    "actual_time": null,
    "actual_latitude": "",
    "actual_longitude": "",
    "epod_url": "",
    "allocated_account_ids": [
      319
    ],
    "invoiced": false,
    "recipient_name": null,
    "actual_cod": null,
    "state": "unassigned",
    "role": "",
    "archived": false,
    "state_updated_at": "2018-06-16T10:57:18.631+08:00",
    "last_started_at": "",
    "last_successful_at": "",
    "is_partial_success": false,
    "job_id": 66177,
    "latest_failure_reason": "",
    "address": {
      "id": 238402,
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
    "job": {
      "id": 66177,
      "guid": "JB2600066177",
      "job_type": "delivery",
      "remarks": "Some Notes",
      "state": "in_progress",
      "archived": false,
      "customer": {
        "id": 14790,
        "guid": "CT2600014790",
        "name": "Big Logistics Company",
        "email": "tan@biglogs.com",
        "contact_person": "Mrs. Tan",
        "contact_number": "91234567",
        "logo_url": "https://yourLogoUrl.com/biglogisticslogo.jpg",
        "archived": false
      },
      "base_task": {
        "id": 238401,
        "guid": "TA2600238401",
        "time_from": "2018-06-16T06:00:00+08:00",
        "time_to": "2018-06-16T15:59:59+08:00",
        "time_type": "custom",
        "actual_time": null,
        "invoiced": false,
        "state": "unassigned",
        "role": "base",
        "service_time": 45,
        "address": {
          "id": 273408,
          "name": "Yummy Restaurant - NEX",
          "zip": 556083,
          "line_1": "23 Serangoon Central",
          "line_2": "#03-04, kitchen door",
          "country": "Singapore",
          "city": "Singapore City",
          "email": "his.email@domain.com",
          "contact_person": "Mr. Person",
          "contact_number": "+6598765432",
          "longitude": 103.872224,
          "latitude": 1.350772
        },
        "billing_account": null
      },
      "tags": [
        {
          "name": "fragile"
        },
        {
          "name": "urgent"
        }
      ]
    },
    "billing_account": null,
    "measurements": [
      {
        "id": 151554,
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
        "id": 151555,
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
    "custom_fields": [
      {
        "id": 89349,
        "custom_field_description_id": 374,
        "value": "abc"
      },
      {
        "id": 89350,
        "value": "10",
        "subvalue": "A Option",
        "custom_field_description_id": 376
      }
    ],
    "tags": [
      {
        "name": "fragile"
      },
      {
        "name": "urgent"
      }
    ],
    "task_assignment": {
      "estimated_start_time": "2018-11-02T08:22:07.652+08:00",
      "driver": {
        "id": 1,
        "name": "Ben",
        "contact_number": "6587655678"
      },
      "vehicle": {
        "id": 2,
        "plate_number": "S1102Z"
      },
      "vehicle_part": {
        "id": 3,
        "plate_number": "V767SS"
      },
      "attendant": {
        "id": 4,
        "name": "Ben",
        "contact_number": "6587655678"
      }
    },
    "vehicle_skills": [
      {
        "name": "skill_1"
      },
      {
        "name": "skill_2"
      }
    ],
    "vehicle_part_skills": [
      {
        "name": "skill_1"
      },
      {
        "name": "skill_2"
      }
    ],
    "driver_skills": [
      {
        "name": "skill_1"
      },
      {
        "name": "skill_2"
      }
    ]
  }
}