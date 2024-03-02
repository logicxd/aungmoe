"use strict";
require('dotenv').config()
const PORT = process.env.PORT || 8081;

/* #region  Imports */
var express = require('express');
var exphbs = require('express-handlebars');
var app = express();
var path = require('path');
var logger = require('morgan');
var passport = require('passport')
var cookieParser = require('cookie-parser')
var cookieSession = require('cookie-session')
var database = require('./src/database/database')
/* #endregion */

/* #region View Engine Setup to handlebars and set up view paths */
var hbs = exphbs.create({
    layoutsDir: path.join(__dirname, 'src/global/view/layout/'),
    // partialsDir: path.join(__dirname, 'src/global/view/partial/'),
    defaultLayout: 'template',
    helpers: {
        // These are helper functions that can be used inside handlebar
        foo: function () { return 'FOO!'; }
    }
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'src/global/view'))
/* #endregion */

/* #region Config Express Routes (must be set before registering routers) */
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(cookieSession({
    name: 'aungmoe-session',
    keys: [process.env.SESSION_SECRET],
    sameSite: "strict",
    maxAge:  365 * 24 * 60 * 60 * 1000   // 1 year
}))
app.use(passport.initialize());
app.use(passport.session());
database.connectIfNeeded()
/* #endregion */

/* #region Connect controllers */
app.use('/', require('./src/app-area/index/index-controller'));
app.use('/blog', require('./src/app-area/blog/blog-controller'));
app.use('/read-novel', require('./src/app-area/read/read-novel/read-novel-controller'));
app.use('/read-webtoon', require('./src/app-area/read/read-webtoon/read-webtoon-controller'));
app.use('/projects', require('./src/app-area/project/project-controller'));
app.use('/bookmark', require('./src/app-area/bookmark/bookmark-controller'));
app.use('/randomize-order', require('./src/app-area/randomize-order/randomize-order-controller'));
app.use('/map-it-notion', require('./src/app-area/map-it-notion/map-it-notion-controller'));
/* #endregion */

/* #region Connect other services */
app.use(express.static(path.join(__dirname, '/src/global')));
app.use('/scripts', express.static(__dirname + "/node_modules/highlight.js/lib/"));
app.use(logger(':method :url :status :res[content-length] - :response-time ms'));
/* #endregion */

/* #region Credits Page */
app.use('/credits', function (req, res) {
    res.render('credit', {
        title: 'Credits - Aung Moe',
        description: 'Copyright informations and citations used in this website.',
        css: ['/css/default.css']
    });
});
/* #endregion */

/* #region Error Page */
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error', {
        title: '404 - Aung Moe',
        description: 'Page not found!',
        css: ['/css/default.css']
    });
});
/* #endregion */

/* #region Global Configs */
// Set reusable css or js links

global.css = {
    animate_css: 'https://cdnjs.cloudflare.com/ajax/libs/animate.css/3.5.2/animate.min.css'
}
global.js = {
    noSleep: 'js/NoSleep.min.js',
    googleMaps: 'https://maps.google.com/maps/api/js?key=AIzaSyB8JnVCl9titkDmd_l2PM7SewOsw0qXgt8',    // Key has to be public
    axios: 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js'
}
global.configs = {
    domainUrl: 'http://www.aungmoe.com',
    websiteTitle: 'Aung Moe',
}
/* #endregion */

app.listen(PORT, function () {
    console.log('Server has started on port ' + PORT);
});

module.exports = app;
