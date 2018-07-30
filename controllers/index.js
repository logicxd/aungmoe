var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
    res.render('index', { 
        title: 'Aung Moe',
        description: 'Aung\'s personal website',
        css: [global.css.material_icons, 'css/index.css', global.css.animate_css, global.css.fontawesome],
        js: [global.js.jquery, global.js.materialize, global.js.header, 'js/index.js', global.js.footer],
        occupations: [
            { state: "Experienced in", occupation: "full-stack development" },
            { state: "Contributes to", occupation: "open source projects" },
            { state: "Partook in", occupation: "research studies at UCI" },
            { state: "Graduated with", occupation: "honors in Computer Science" },
        ]
    });
});

module.exports = router;
