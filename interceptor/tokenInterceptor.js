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


router.use(async (req, res, next) => {
    let loginPageUrl = '/login';
    log.warn("req.url:" + req.url);

    if (req.query.token) {
        return next()
    }
    if (req.url.startsWith('/mobileCV')) {
        loginPageUrl = '/mobileCV/login';
    } else if (req.url.startsWith('/mobilePOC')) {
        loginPageUrl = '/mobilePOC/login';
    }
    let token = req.cookies.token
    if (UrlWhiteList.includes(req.url) || req.url.startsWith('/mobileTO') || req.url.startsWith('/callback') || req.url.startsWith('/mobile-callback')) {
        next();
    } else if (!token) {
        log.warn('There is no token !');
        return redirectToFrontend(res, loginPageUrl, req.method)
    } else {
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
                next();
            } else {
                log.warn(`User id ${userId} does not have a role!`);
                redirectToFrontend(res, loginPageUrl, req.method);
            }
        } catch (error) {
            if (error.expiredAt) {
                log.warn('(Token Interceptor): Token is expired at ', err.expiredAt);
            } else {
                log.warn('(Token Interceptor): Token is invalid !');
            }
            redirectToFrontend(res, loginPageUrl, req.method);
        }
    }

});
module.exports = router;