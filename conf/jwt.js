
module.exports.JWTHeader = {
    type: 'JWT',
    // ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'HS256', 'HS384', 'HS512', 'none']
    algorithm: 'HS256', // Command: openssl list -digest-algorithms
    expire: 60 * 60 * 24, // seconds
}

module.exports.SecretKey = 'aEFswerasdUSJDKLdnsadnashdU';

module.exports.UrlWhiteList = ['/login', '/mobilePOC/login','/mobileCV/login','/mobilePOC/register-poc','/mobilePOC/changePocPwd',
    '/loginServer', '/findAllGroup', '/getTypeOfVehicle', '/transportJsonApi', '/invoice/pdf', '/mobile/task/updateState', '/mobile/task/noshow',
    '/checkIfPwdReuse','/getUserExistByNric', '/registerPocUser', '/getUserExistByContactNumber', '/ChangePassword',
    '/task/getAssignableTaskList2','/task/getAssignableTaskDashboard', '/task/assignTask', '/task/updateTask', '/task/getHubNumber',
    '/mobileTO/getTOIndents', '/mobileTO/updateDriver', '/mobileTO/updateVehicle', '/mobileTO/startTask', '/mobileTO/endTask',
    '/home', '/callback','/mobile-callback', '/mobileCV/mobileSingpass', '/mobileCV/loginUseSingpass', '/loginUseSingpass', '/contact_us', '/getRegisterUrl',
    '/getDecodeAESCode'
]