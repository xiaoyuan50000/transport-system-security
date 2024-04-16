const conf = require('../conf/conf')

const clientId = conf.SgidClient.CLIENT_ID
const clientSecret = conf.SgidClient.CLIENT_SECRET
const hostname = conf.SgidClient.HOSTNAME

const privateKey = conf.SgidClient.PRIVATE_KEY
const publicKey = conf.SgidClient.PUBLIC_KEY

const { User } = require('../model/user')

const sgid = require('../lib/sgid')
const config = require('../lib/config')
const utils = require('../util/utils')

const { USER_STATUS } = require('../util/content');
const loginService = require('../services/loginService');
const log4js = require('../log4js/log.js');
const log = log4js.logger('Singpass Callback');


const getUserInfo = function (data) {
  let nric = ""
  let name = ""
  for (const [key, value] of data) {
    if (key == "NRIC NUMBER") {
      nric = value
    }
    if (key == "NAME") {
      name = value
    }
  }
  return { nric, name }
}
/**
 * Main controller function to generate the callback page
 *
 * @param {*} req
 * @param {*} res
 */
async function index(req, res) {
  try {
    const { code, state } = req.query
    const baseurl = config.baseUrls[state]

    const { accessToken } = await fetchToken(baseurl, code)
    const { sub, data } = await fetchUserInfo(
      baseurl,
      accessToken,
      privateKey
    )

    let { nric, name } = getUserInfo(data)
    let loginName = utils.GetLoginName(nric, name)
    log.info(`LoginName: ${loginName}, FullName: ${name}`)

    let userBase = await loginService.getUserExistByLoginName(loginName)
    if (userBase.code == 0) {
      return res.render('login', { title: 'Login', error: userBase.errorMsg })
    }

    let user = await User.findOne({ where: { loginName: loginName, username: name } });

    if (!user) {
      const error = "Login failed. User does not exist."
      console.log(error)
      log.error(error)
      return res.render('login', { title: 'Login', error: error })
    }

    if (user.status == USER_STATUS.LockOut) {
      await loginService.lockOutUser(user)
      let error = `Account [${loginName}] is locked, please contact administrator.`
      log.error(error)
      return res.render('login', { title: 'Login', error: error })
    } 
    else if (user.status == USER_STATUS.Deactivated) {
      await loginService.deactivatedUser(user)
      let error = `Account [${loginName}] is deactivated, please contact administrator.`
      log.error(error)
      return res.render('login', { title: 'Login', error: error })
    }

    if (user.ORDExpired) {
      let error = `Login Failed. Account [${loginName}] ORD Expired, please contact administrator.`
      log.error(error)

      return res.render('login', { title: 'Login', error: error })
    }

    user.sgid = sub
    await user.save()
    return res.render('callback', {
      data: loginName + "@" + name,
      sysType: 'window'
    })

  } catch (error) {
    console.log(error)
    log.error(error)
    // res.status(500).render('error', { error })
    return res.render('login', { title: 'Login', error: error })
  }
}

/**
 * Fetches the token from the oauth endpoint
 *
 * @param {string} baseUrl
 * @param {string} code
 */
async function fetchToken(baseUrl, code) {
  try {
    return await sgid.fetchToken(
      baseUrl,
      clientId,
      clientSecret,
      `${hostname}/callback`,
      code
    )
  } catch (error) {
    console.error(`Error in fetchToken: ${error.message}`)
    throw error
  }
}

/**
 * Fetches user info
 *
 * @param {string} baseUrl
 * @param {string} accessToken
 * @param {string} privateKeyPem
 * @return {object} { sub: string, data: array }
 */
async function fetchUserInfo(baseUrl, accessToken, privateKeyPem) {
  try {
    const { sub, data } = await sgid.fetchUserInfo(
      baseUrl,
      accessToken,
      privateKeyPem
    )
    return {
      sub,
      data: formatData(data),
    }
  } catch (error) {
    console.error(`Error in fetchUserInfo: ${error.message}`)
    throw error
  }
}

/**
 * Formats the data into an array of arrays,
 * specifically for the display on the frontend
 *
 * @param {object} result
 * @returns {array}
 */
function formatData(result) {
  const formattedResult = []

  for (const [key, value] of Object.entries(result)) {
    formattedResult.push([prettifyKey(key), value])
  }

  return formattedResult
}

/**
 * Converts a key string from dot-delimited into uppercase
 * for frontend display
 *
 * @param {string} key
 * @returns {string}
 */
function prettifyKey(key) {
  let prettified = key.split('.')[1]
  prettified = prettified.replace(/_/g, ' ')
  return prettified.toUpperCase()
}

module.exports = index
