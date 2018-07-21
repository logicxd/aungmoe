var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
    res.render('index', { 
        title: 'Aung Moe',
        description: 'Home Page',
        css: [global.css.material_icons, 'css/index.css', global.css.animate_css],
        js: [global.js.jquery, 'js/_header.js', 'js/index.js'],
        occupations: [
            { state: "I'm a", occupation: "Software Engineer" },
            { state: "Currently learning", occupation: "React + Nodejs" },
            { state: "Just graduated from", occupation: "UCI with a BS" },
            { state: "I'm available", occupation: "for hire" },
        ]
    });
});

module.exports = router;
