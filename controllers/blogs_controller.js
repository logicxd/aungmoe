"use strict";
var express = require('express');
var router = express.Router();
var fs = require('fs-extra');
var path = require('path');
var moment = require('moment');
var mdMeta = require('markdown-it-meta');
var md = require('markdown-it')().use(mdMeta);

var pagesDir = './public/pages';
var pages = {};

// Check if json has all the properties in the ROOT level.
function hasProperties(json, properties) {
    var hasAll = true;
    properties.forEach(property => {
        hasAll &= json.hasOwnProperty(property);    
    });
    return hasAll;
}

// Parse markdown pages.
try {
    for (var file of fs.readdirSync(pagesDir)) {
        var filePath = path.join(pagesDir, file);
        var rawMd = fs.readFileSync(filePath, 'utf8');
        var html = md.render(rawMd);
        var metaData = md.meta;
        metaData.date = moment(metaData.date);

        console.log(file);

        if (!hasProperties(metaData, ['category', 'date', 'title', 'filename'])) {
            console.log(`Markdown page missing 1 or more YAML properties. File: ${filePath}`);
            continue;
        }

        var pageInfo = {
            dateString: metaData.date.format('MMM DD, YYYY'),
            url: `${metaData.category}/${metaData.date.format('YYYY/MM/DD')}/${metaData.filename}`,
            html: html
        };

        if (pages[pageInfo.url] == null) {
            pages[pageInfo.url] = pageInfo;
        } else {
            throw 'Duplicate pages found';
        }
    }
}
catch (err) {
    console.log('Error parsing markdown pages: ' + err);
    process.exit(1);
}

router.get('/', function (req, res) {
    res.render('blogs', {
        title: 'Blogs - Aung Moe',
        description: 'Aung\'s personal website',
        css: [global.css.material_icons, 'css/blogs.css', global.css.animate_css, global.css.fontawesome],
        js: [global.js.jquery, global.js.materialize, global.js.header, 'js/index.js', global.js.footer],
    });
});


router.get('/:id*', function (req, res) {
    console.log(`Url: /blog/${req.params.id}`);
    var rawMd = fs.readFileSync(path.join(pagesDir, file), 'utf8');
    const renderedDoc = md.render(rawMd);
    // console.log(md.meta);
    res.send(renderedDoc);
});

module.exports = router;