const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWTHeader, SecretKey, UrlWhiteList } = require('../conf/jwt');
const { User } = require('../model/user');
const { Role } = require('../model/role');

const log4js = require('../log4js/log.js');
const log = log4js.logger('Token Interceptor');

router.use(async (req, res, next) => {
    var loginPageUrl = '/login';
    log.warn("req.url:" + req.url);

    if (req.query.token) {
        return next()
    }
    if (req.url.startsWith('/mobileCV')) {
        loginPageUrl = '/mobileCV/login';
    } else if (req.url.startsWith('/mobilePOC')) {
        loginPageUrl = '/mobilePOC/login';
    }
    // log.warn("login url:" + loginPageUrl);
    let token = req.cookies.token
    if (UrlWhiteList.includes(req.url) || req.url.startsWith('/mobileTO') || req.url.startsWith('/callback') || req.url.startsWith('/mobile-callback')) {
        next();
    } else if (!token) {
        log.warn('There is no token !');
        if(req.method == 'GET'){
            res.redirect(loginPageUrl);
        } else {
            res.setHeader("Location", loginPageUrl)
            res.status(302).json(loginPageUrl);
        }
    } else {
        // https://www.npmjs.com/package/jsonwebtoken
        jwt.verify(token, SecretKey, { algorithms: JWTHeader.algorithm.toUpperCase() }, async function (err, decoded) {
            if (err) {
                if (err.expiredAt) {
                    log.warn('(Token Interceptor): Token is expired at ', err.expiredAt);
                    res.clearCookie('token');
                    if(req.method == 'GET'){
                        res.redirect(loginPageUrl);
                    } else {
                        res.setHeader("Location", loginPageUrl)
                        res.status(302).json(loginPageUrl);
                    }
                } else {
                    log.warn('(Token Interceptor): Token is invalid !');
                    res.clearCookie('token');
                    if(req.method == 'GET'){
                        res.redirect(loginPageUrl);
                    } else {
                        res.setHeader("Location", loginPageUrl)
                        res.status(302).json(loginPageUrl);
                    }
                }
            } else {
                let userId = decoded.data.id
                let groupId = decoded.data.groupId
                let user = await User.findByPk(userId)
                if (user == null || user != null && user.token != token) {
                    res.clearCookie('token');
                    if(req.method == 'GET'){
                        res.redirect(loginPageUrl);
                    } else {
                        res.setHeader("Location", loginPageUrl)
                        res.status(302).json(loginPageUrl);
                    }
                } else {
                    if (user.role) {
                        let role = await Role.findByPk(user.role)
                        if (req.body.roleName && req.body.roleName != role.roleName) {
                            res.clearCookie('token');
                            if(req.method == 'GET'){
                                res.redirect(loginPageUrl);
                            } else {
                                res.setHeader("Location", loginPageUrl)
                                res.status(302).json(loginPageUrl);
                            }
                        } else {
                            log.warn('(Token Interceptor): Token is correct !');
                            req.body.userId = userId
                            req.body.operatorId = userId
                            req.body.createdBy = userId
                            req.body.groupId = groupId
                            if (req.url == '/indent/create') {
                                req.body.indent.createdBy = userId
                            }
                            next();
                        }
                    }
                }
            }
        });
    }

});
module.exports = router;