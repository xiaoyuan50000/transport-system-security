const conf = require('../conf/conf.js');
module.exports.CreateJobJson = {
    "job": {
      "job_type": "pickup",
      "remarks": "",
      "customer_attributes": {
        "name": "Unit A"
      },
      "base_task_attributes": {
        "time_from": "2022-06-15T10:00:00+08:00",
        "time_to": "2022-06-15T10:15:00+08:00",
        "time_type": "custom",
        "service_time": "300",
        "address_attributes": {
          "line_1": "Yio Chu Kang MRT",
          "zip": "460139",
          "country": "Singapore",
          "latitude": "1.3333",
          "longitude": "103.555555",
          "contact_person": "May",
          "contact_number": "123456789",
          "email": "abc@mail.com"
        }
      },
      "tasks_attributes": [
        {
          "invoice_number": "",
          "tracking_id": "",
          "time_from": "2022-06-15T08:00:00+08:00",
          "time_to": "2022-06-15T08:15:00+08:00",
          "time_type": "custom",
          "remarks": "call POC",
          "service_time": "300",
          "address_attributes": {
            "line_1": "Bishan MRT",
            "zip": "460139",
            "country": "Singapore",
            "latitude": "1.333333",
            "longitude": "103.5555555",
            "contact_person": "May",
            "contact_number": "123456789",
            "email": "abc@mail.com"
          },
          "tag_list": [
            "Bus",
            "NDP"
          ],
          "custom_field_group_id": conf.CreateJobJsonField.GroupIdField,
          "custom_fields_attributes": [
            {
              "custom_field_description_id": conf.CreateJobJsonField.UserNameField,
              "value": "Sunny"
            },
            {
              "custom_field_description_id": conf.CreateJobJsonField.ContactNumberField,
              "value": "98765432"
            },
            {
              "custom_field_description_id": conf.CreateJobJsonField.ResourceField, // test environment
              // "custom_field_description_id": 2503, // production environment
              "value": "40 Seater bus"
            },
            {
              "custom_field_description_id": conf.CreateJobJsonField.ServiceModeField,
              "value": "Disposal"
            },
            {
              "custom_field_description_id": conf.CreateJobJsonField.TrackingIdField,
              "value": "Ops"
            },
            {
              "custom_field_description_id": conf.CreateJobJsonField.ActivityNameField,
              "value": "Training"
            },
            {
              "custom_field_description_id": conf.CreateJobJsonField.StartTimeField,
              "value": ""
            },
            {
              "custom_field_description_id": conf.CreateJobJsonField.EndTimeField,
              "value": ""
            },
            // {
            //   "custom_field_description_id": 2572,
            //   "value": "https://<url>/payment?rsp_id=310"
            // },
            {
              "custom_field_description_id": conf.CreateJobJsonField.PoNumberField,
              "value": "PO Generated"
            }
          ]
        }
      ]
    }
  }