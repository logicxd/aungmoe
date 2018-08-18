"use strict";
var express = require('express');
var router = express.Router();
var marked = require('marked');
var fs = require('fs-extra');
var path = require('path');

var pagesDir = './public/pages';
var pages = [];

// Parse markdown pages.
try {
    
    for (var file of fs.readdirSync(pagesDir)) {
        console.log(`Filename: ${file}`);
        console.log(fs.readFileSync(path.join(pagesDir, file), { encoding: 'utf8' }));


        var pageInfo = {
            date: '',
            title: '',
            md: fs.readFileSync(path.join(pagesDir, file), { encoding: 'utf8' })
        };
        pages.push(pageInfo);
    }
}
catch (err) {
    console.log('Error reading markdown pages: ' + err);
    process.exit(1);
}

router.get('/', function (req, res) {
    res.render('blog', {
        title: 'Blog - Aung Moe',
        description: 'Aung\'s personal website',
        css: [global.css.material_icons, 'css/blog.css', global.css.animate_css, global.css.fontawesome],
        js: [global.js.jquery, global.js.materialize, global.js.header, 'js/index.js', global.js.footer],
    });
});

router.get('/:id/*', function (req, res) {

    // console.log(`GET /blog/${req.params.id}`);
    res.send(marked(fs.readFileSync(path.join(pagesDir, file), { encoding: 'utf8' })));
});

module.exports = router;