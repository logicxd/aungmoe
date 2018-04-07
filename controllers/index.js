var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
    res.render('index', { 
        title: 'David Moe',
        description: 'Home Page',
        css: [global.css.material_icons, 'css/index.css'],
        js: [global.js.jquery, 'js/_header.js']
    });
});

module.exports = router;
