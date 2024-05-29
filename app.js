let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let cors = require('cors');
let ejs = require('ejs');
let log4js = require('./log4js/log.js');
let Response = require('./util/response.js');
let session = require('express-session');
const helmet = require('helmet');
const crypto = require('crypto');
const systemConf = require('./conf/systemConf');
const conf = require('./conf/conf');
const rateLimit = require('express-rate-limit');
const utils = require('./util/utils.js');
const csrf = require('csurf');

const { createProxyMiddleware } = require('http-proxy-middleware');
log4js.configure();

const tokenInterceptor = require('./interceptor/tokenInterceptor');
const urlInterceptor = require('./interceptor/urlInterceptor');
const indexRouter = require('./routes/index');
const providerRouter = require('./routes/provider');

const chatRouter = require('./routes/chat');
const uploadRouter = require('./routes/upload');
const mobileRouter = require('./routes/mobile');
const mobileCVRouter = require('./routes/mobileCV');
const mobilePOCRouter = require('./routes/mobilePOC');
const mobileTORouter = require('./routes/mobileTO');

const home = require('./singpass/home')
const callback = require('./singpass/callback')
const mobileCallback = require('./singpass/mobileCallback')
let ActiveMQ = require('./activemq/activemq.js');

let app = express();
const cpuRouter = require('./routes/cpu')
app.use('/cpu', cpuRouter)

const limiter = rateLimit({
	windowMs: utils.apiLimiter.windowMs,
	max: utils.apiLimiter.max,
	message: utils.apiLimiter.message,
})
app.use(limiter)

const csrfProtection = csrf({ cookie: { secure: true, httpOnly: true } });

const proxyOptions = {
	target: conf.atms_server_url,
	changeOrigin: true,
	pathRewrite: {
		'^/atms': '',
	},
	onProxyRes: function (proxyRes, req, res) {
		res.header('Access-Control-Allow-Credentials', true);
	},
};
app.use('/atms', createProxyMiddleware(proxyOptions));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('html', ejs.__express);
app.set('view engine', 'html');

app.use(logger('dev'));
app.use(express.json({ limit: '16mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


app.use(function (req, res, next) {
	if (['/._darcs', '/.bzr', '/.hg', '/BitKeeper', '/latest/meta-data/'].includes(req.url)) {
		const err = new Error('Not Found');
		err.status = 404;
		next(err);
	} else {
		next()
	}
});

app.use((req, res, next) => {
	res.locals.cspNonce = crypto.randomBytes(32).toString("hex");
	next();
});
app.use(helmet({
	contentSecurityPolicy: {
		useDefaults: false,
		directives: {
			// "default-src": ["'self' 'unsafe-inline' 'unsafe-eval'"],
			"default-src": ["'self'"],
			"script-src": ["'self' 'unsafe-inline' blob:"],
			// "script-src": ["'self' blob:", (req, res) => `'nonce-${res.locals.cspNonce}'`],
			// "script-src-attr": ["'self' 'unsafe-inline' 'unsafe-eval'"],
			"script-src-attr": ["'self' 'unsafe-inline'"],
			"style-src": ["'self' 'unsafe-inline'"],
			// "style-src": ["'self' 'unsafe-inline' 'unsafe-eval'"],
			"connect-src": ["'self'"],
			"img-src": ["'self' data:"],
			"form-action": ["'self'"],
			"frame-ancestors": ["'self'"],
			// 'upgrade-insecure-requests': [],
		},
		// reportOnly: true,
	},
}));


app.use(session({
	secret: process.env.SESSION_SECRET || systemConf.sessionSecret,
	resave: false,
	saveUninitialized: false,
	cookie: {
		sameSite: "Strict"
	},
}));

app.use(express.static(path.join(__dirname, 'public')));
const options = {
	maxAge: 30 * 24 * 3600 * 1000,
}
app.use(express.static(path.join(__dirname, 'node_modules'), options));
app.use(express.static(path.join(__dirname, 'resources'), options));
app.use(cors({
	origin: `http://localhost`
}));

app.use(tokenInterceptor);
app.use(urlInterceptor);
app.use('/', indexRouter);
app.use('/chat', chatRouter);
app.use('/upload', uploadRouter);
app.use('/mobile', mobileRouter);
app.use('/provider', providerRouter);
app.use('/mobileCV', mobileCVRouter);
app.use('/mobilePOC', mobilePOCRouter);
app.use('/mobileTO', mobileTORouter);

app.get('/home', home)
app.get('/callback', callback)
app.get('/mobile-callback', mobileCallback)



// catch 404 and forward to error handler
app.use(function (req, res, next) {
	res.render('404');
});

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};
	log4js.logger("error").error("HTTP Request URL: %s", req.originalUrl);
	log4js.logger("error").error("HTTP Request Body: %s", req.body);
	log4js.logger("error").error(err);
	// render the error page
	res.status(err.status || 500);
	Response.error(res, err.message, 500);
});

process.on('uncaughtException', function (e) {
	log4js.logger("error").error(`uncaughtException`)
	log4js.logger("error").error(e)
});
process.on('unhandledRejection', function (err, promise) {
	log4js.logger("error").error(`unhandledRejection`);
	log4js.logger("error").error(err);
})

require('./sequelize/dbHelper');

const fs = require('fs');
let downloadPath = path.join('./', 'public/download/');
if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

let chatUploadPath = path.join('./', 'public/chat/upload/');
if (!fs.existsSync(chatUploadPath)) fs.mkdirSync(chatUploadPath);

let indentPath = path.join('./', 'public/download/indent/');
if (!fs.existsSync(indentPath)) fs.mkdirSync(indentPath);

let invoicePath = path.join('./', 'public/download/invoice/');
if (!fs.existsSync(invoicePath)) fs.mkdirSync(invoicePath);

/**
 * Init ActiveMQ Client
 */
ActiveMQ.initActiveMQ();

module.exports = app;