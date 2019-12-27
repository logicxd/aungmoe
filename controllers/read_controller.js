"use strict";
var express = require('express');
var router = express.Router();
var rp = require('request-promise');
var unfluff = require('unfluff');
var hljs = require('highlight.js');

router.get('/', async function (req, res) {
    function loadSetupPage() {
        res.render('read-setup', {
            title: 'Read Setup - Aung Moe',
            description: 'Aung\'s personal website',
            css: [global.css.material_icons, '/css/read.css', global.css.animate_css, global.css.fontawesome],
            js: [global.js.jquery, global.js.materialize, global.js.header, '/js/read.js', global.js.footer]
        });
    }

    async function loadReadPage() {
        var html = '';
        try {
            html = await rp(req.query.url);
        } catch (error) {
            console.log(error);
            html = '';
        }
        
        var data = unfluff(html);
        var paragraphs = data.text.split('\n\n');
        
        res.render('read', {
            title: `${data.title} - Aung Moe`,
            description: 'Aung\'s personal website',
            css: [global.css.material_icons, '/css/read.css', global.css.animate_css, global.css.fontawesome],
            js: [global.js.jquery, global.js.materialize, global.js.header, '/js/read.js', global.js.footer],
            textTitle: data.title,
            textParagraphs: paragraphs,
            didError: html === ''
        });
    }
    
    if (req.query.url) {
        await loadReadPage();
    } else {
        loadSetupPage();
    }
});

module.exports = router;