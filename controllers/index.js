var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
    res.render('index', { 
        title: 'Aung Moe',
        description: 'Home Page',
        css: [global.css.material_icons, 'css/index.css', global.css.animate_css],
        js: [global.js.jquery, 'js/_header.js', 'js/index.js'],
        occupations: [
            { state: "I'm a", occupation: "Backend Developer" },
            { state: "I also enjoy", occupation: "Frontend" },
            { state: "I'm studying", occupation: "CS at UCI" },
            { state: "So", occupation: "hire me pls" }
        ]
    });
});

module.exports = router;
