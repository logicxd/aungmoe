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
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

// Create controllers
var index = require('./controllers/index');

// Connect controllers 
app.use(logger(':method :url :status :res[content-length] - :response-time ms'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', index);

// Error handler
app.use(function (err, req, res, next) {
    // Render the error page
    console.error(err.stack);
    res.status(err.status || 500);
    res.render('error', { error: err});
});

module.exports = app;