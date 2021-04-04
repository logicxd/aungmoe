"use strict";
const PORT = process.env.PORT || 8081;

var express = require('express');
var exphbs = require('express-handlebars');
var app = express();
var path = require('path');
var logger = require('morgan');

/* #region View Engine Setup to handlebars and set up view paths */
var hbs = exphbs.create({
    layoutsDir: path.join(__dirname, 'src/'),
    // partialsDir: path.join(__dirname, 'src/global/view/partial/'),
    defaultLayout: 'global/view/layout/template',
    helpers: {
        // These are helper functions that can be used inside handlebar
        foo: function () { return 'FOO!'; }
    }
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'src/global/view'))
/* #endregion */

/* #region Connect controllers */
app.use('/', require('./src/app-area/index/index-controller'));
app.use('/blog', require('./src/app-area/blog/blog-controller'));
app.use('/read-novel', require('./src/app-area/read/read-novel/read-novel-controller'));
app.use('/read-webtoon', require('./src/app-area/read/read-webtoon/read-webtoon-controller'));
app.use('/project', require('./src/app-area/project/project-controller'));
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