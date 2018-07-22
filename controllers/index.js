var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
    res.render('index', { 
        title: 'Aung Moe',
        description: 'Learn more about Aung!',
        css: [global.css.material_icons, 'css/index.css', global.css.animate_css],
        js: [global.js.jquery, 'js/_header.js', 'js/index.js'],
        occupations: [
            { state: "Experienced in", occupation: "full-stack development" },
            { state: "Contributes to", occupation: "open source projects" },
            { state: "Partook in", occupation: "researches at UCI" },
            { state: "Graduated with", occupation: "honors in Computer Science" },
        ]
    });
});

module.exports = router;
