const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWTHeader, SecretKey, UrlWhiteList } = require('../conf/jwt');
const { User } = require('../model/user');
const { Role } = require('../model/role');

const log4js = require('../log4js/log.js');
const log = log4js.logger('Token Interceptor');

const redirectToFrontend = (res, loginPageUrl, method) => {
    res.clearCookie('token');
    if (method === 'GET') {
        res.redirect(loginPageUrl);
    } else {
        res.setHeader("Location", loginPageUrl)
        res.status(302).json(loginPageUrl);
    }
};

const getLoginPageUrl = function (req) {
    if (req.url.startsWith('/mobileCV')) {
        return '/mobileCV/login';
    }
    if (req.url.startsWith('/mobilePOC')) {
        return '/mobilePOC/login';
    }
    return '/login';

}

const verifyToken = async function (res, req, token, loginPageUrl, next) {
    try {
        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(token, SecretKey, { algorithms: JWTHeader.algorithm.toUpperCase() }, (err, decoded) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(decoded);
                }
            });
        });

        const userId = await decoded.data.id;
        const groupId = await decoded.data.groupId;
        const user = await User.findByPk(userId);

        if (!user || user.token !== token) {
            return redirectToFrontend(res, loginPageUrl, req.method);
        }

        if (user.role) {
            const role = await Role.findByPk(user.role);
            if (req.body.roleName && req.body.roleName !== role.roleName) {
                log.warn(`User id ${userId} role changed from ${req.body.roleName} to ${role.roleName}!`);
                return redirectToFrontend(res, loginPageUrl, req.method);
            }

            log.info('Token is correct!');
            req.body.userId = userId;
            req.body.operatorId = userId;
            req.body.createdBy = userId;
            req.body.groupId = groupId
            if (req.url === '/indent/create') {
                req.body.indent.createdBy = userId;
            }
            return next();
        } else {
            log.warn(`User id ${userId} does not have a role!`);
            return redirectToFrontend(res, loginPageUrl, req.method);
        }
    } catch (error) {
        if (error.expiredAt) {
            log.warn('(Token Interceptor): Token is expired at ', error.expiredAt);
        } else {
            log.warn('(Token Interceptor): Token is invalid !');
        }
        return redirectToFrontend(res, loginPageUrl, req.method);
    }
}

router.use(async (req, res, next) => {
    log.warn("req.url:" + req.url);

    let loginPageUrl = getLoginPageUrl(req)
    let token = req.cookies.token
    if (req.query.token || UrlWhiteList.includes(req.url) || req.url.startsWith('/mobileTO') || req.url.startsWith('/callback') || req.url.startsWith('/mobile-callback')) {
        return next();
    } else if (!token) {
        log.warn('There is no token !');
        return redirectToFrontend(res, loginPageUrl, req.method)
    } else {
        await verifyToken(res, req, token, loginPageUrl, next)
    }

});
module.exports = router;