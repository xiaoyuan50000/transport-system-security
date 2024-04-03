/**
 * @param code  {1=>Success,0=>Fail}
 * @param msg  response msg
 */
function response(code,str){
    return {
        "resp_code": code,
        "resp_msg": str
    }
}
module.exports.response = response;

