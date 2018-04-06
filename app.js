const PORT = process.env.PORT || 8081;

var express = require('express');
var exphbs = require('express-handlebars');
var app = express();
var path = require('path');
var logger = require('morgan');

// Server
var server = app.listen(PORT, function () {
    console.log('Server has started on port ' + PORT);
});

// View engine setup
var hbs = exphbs.create({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, './views/layouts/'),
    partialsDir: path.join(__dirname, './views/partials/'),
    helpers: {
        foo: function() { return 'FOO!'; }
    }
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

// Create controllers
var index = require('./controllers/index');

// Connect controllers and other services
app.use(express.static(path.join(__dirname, 'public')));
app.use(logger(':method :url :status :res[content-length] - :response-time ms'));
app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.send('error');
    // res.render('error', { error: err });
});

// Set reusable css or js links
global.css = {
    material_icons: 'https://fonts.googleapis.com/icon?family=Material+Icons'
}
global.js = {
    jquery: 'https://code.jquery.com/jquery-3.2.1.min.js'
}

module.exports = app;