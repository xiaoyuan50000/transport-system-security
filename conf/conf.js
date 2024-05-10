/**
 * DB
 */
module.exports.dbConf = {
    host: '192.168.1.5',
	// host: '192.168.1.11',
    user: 'root',
    password: 'root',
    // port: 6446,
    port: 3306,
    // database: 'tms_test_migrate',
    database: 'tms2',
    timezone: 'GMT%2B8',
    multipleStatements: true,
	connectionLimit: 2000,
};

module.exports.driverDbConf = {
    // host: 'localhost',
    host: '192.168.1.18',
    user: 'root',
    password: 'root',
    port: 3306,
    // database: 'tms_test_migrate',
    database: 'mobius-driver',
    timezone: 'GMT%2B8',
    multipleStatements: true,
	connectionLimit: 1100,
};

module.exports.port = 5001;

module.exports.serverPortHttps = 5002;


module.exports.upload_schedule_path = './public/uploads/schedule/';

module.exports.upload_indent_path = './public/uploads/indent/';


module.exports.client_id = '07c5b4b3c04e43'

module.exports.client_secret = '12ba92cb80fd6c42'

module.exports.create_job_url = ''

module.exports.get_driver_url = ''

module.exports.get_vehicle_url = ''

module.exports.get_task_pin_url = ''

module.exports.cancel_job_url = ''

module.exports.work_flow_url = 'http://localhost:8090'

module.exports.request_3rd_part = false

module.exports.poc_role_id = 5

// If the price is encrypted
module.exports.encrypt_price = false
/**
 * ActiveMQ
*/
module.exports.activeMQConf = ['localhost', 61613, '', '', '1.0', null, { retries: 10000, delay: 5000 }];

// re-submitted
module.exports.ReSubmittedDay = 5

module.exports.SgidClient = {
    SCOPES: process.env.SCOPES,
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    HOSTNAME: process.env.HOSTNAME,
    REDIRECT_URL: process.env.REDIRECT_URL,
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    PUBLIC_KEY: process.env.PUBLIC_KEY,
}

module.exports.CreateJobJsonField = {
    UserNameField: 2502,
    ContactNumberField: 2549,
    ResourceField: 2503,
    ServiceModeField: 2504,
    TrackingIdField: 2505,
    ActivityNameField: 2510,
    StartTimeField: 2511,
    EndTimeField: 2512,
    PoNumberField: 2571,
    GroupIdField: 511,
}

module.exports.MobiusUnit = {
    peakTime: "03:00-10:30",
    lateTime: "10:30-16:00",
    availableTime: "06:00-16:00",
}

// firebase url
module.exports.firebase_notification_url = 'http://localhost:10000/publicFirebaseNotification'

module.exports.endorse_complete_limit_day = 14
// format: YYYY-MM-DD
module.exports.group_restriction_start_on = '2023-12-01'
// true/false
module.exports.group_restriction_off = false

module.exports.group_unlock_restriction_day = 7

module.exports.mobius_server_url = 'http://192.168.1.18:5000'

module.exports.auto_assign = false 

module.exports.view_nric = false

module.exports.atms_server_url = 'http://localhost:5022'
