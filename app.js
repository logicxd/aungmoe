"use strict";
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
var indexController = require('./controllers/index_controller');
var blogsController = require('./controllers/blogs_controller');

// Connect controllers and other services
app.use(express.static(path.join(__dirname, 'public')));
app.use(logger(':method :url :status :res[content-length] - :response-time ms'));
app.use('/', indexController);
app.use('/blogs', blogsController);
app.use('/credits', function (req, res) {
    res.render('credit', { 
        title: 'Credits - Aung Moe',
        description: 'Copyright informations and citations used in the production of this website.',
        css: [global.css.material_icons, 'css/default.css', global.css.animate_css, global.css.fontawesome],
        js: [global.js.jquery, global.js.materialize, global.js.header, global.js.footer]
    });
});

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
    // res.send('Erorr 404!');
    res.status(err.status || 500);
    res.render('error', { 
        title: '404 - Aung Moe',
        description: 'Page not found!',
        css: [global.css.material_icons, 'css/default.css', global.css.animate_css, global.css.fontawesome ],
        js: [global.js.jquery, global.js.materialize, global.js.header, global.js.footer]
    });
});

// Set reusable css or js links
global.css = {
    material_icons: 'https://fonts.googleapis.com/icon?family=Material+Icons',
    animate_css: 'https://cdnjs.cloudflare.com/ajax/libs/animate.css/3.5.2/animate.min.css',
    fontawesome: 'https://use.fontawesome.com/releases/v5.2.0/css/all.css'
}
global.js = {
    jquery: 'https://code.jquery.com/jquery-3.2.1.min.js',
    materialize: 'js/materialize.min.js',
    header: 'js/_header.js',
    footer: 'js/_footer.js',
}

module.exports = app;