"use strict";
var express = require('express');
var router = express.Router();
var fs = require('fs-extra');
var path = require('path');
var moment = require('moment');
var hljs = require('highlight.js');
var mdMeta = require('markdown-it-meta');
var emoji = require('markdown-it-emoji');
var md = require('markdown-it')({
    html: true,
    linkify: true,
    typographer: true,
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return '<pre class="hljs"><code>' +
                    hljs.highlight(lang, str, true).value +
                    '</code></pre>';
            } catch (__) { }
        }
        return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
    }
}).use(mdMeta).use(emoji);

var pagesDir = './src/public/pages';
var pages = {};
var sortedPages = [];

// Check if json has all the properties in the ROOT level.
function hasProperties(json, properties) {
    return properties.every(property => {
        return json.hasOwnProperty(property);
    });
}

function timeToRead(text) {
    var wordCount = text.split(' ').length;
    var wordsPerMinute = 200;
    return Math.ceil(wordCount / wordsPerMinute);
}

// Parse markdown pages.
try {
    for (var file of fs.readdirSync(pagesDir)) {
        if (file.split('.').pop() !== 'md') {
            continue; 
        }

        var filePath = path.join(pagesDir, file);
        var rawMd = fs.readFileSync(filePath, 'utf8');
        var html = md.render(rawMd);
        var metaData = md.meta;
        metaData.date = moment.utc(metaData.date);
        metaData.updatedDate = moment.utc(metaData.updatedDate);
        
        if (!hasProperties(metaData, ['category', 'date', 'updatedDate', 'title', 'urlName'])) {
            console.log(`Markdown page missing 1 or more YAML properties. File: ${filePath}`);
            continue;
        }

        var pageInfo = {
            category: metaData.category,
            date: metaData.date,
            dateString: metaData.date.format('MMM DD, YYYY'),
            updatedDateString: metaData.updatedDate.format('MMM DD, YYYY'),
            title: metaData.title,
            url: `${metaData.category}/${metaData.date.format('YYYY/MM/DD')}/${metaData.urlName}`.toLowerCase(),
            html: html,
            timeToRead: timeToRead(rawMd)
        };

        if (pages[pageInfo.url] == null) {
            pages[pageInfo.url] = pageInfo;
            sortedPages.push(pageInfo);
        } else {
            throw 'Duplicate pages found';
        }
    }

    // Order from most recent to oldest.
    sortedPages.sort((a, b) => b.date - a.date);
}
catch (err) {
    console.log('Error parsing markdown pages: ' + err);
    process.exit(1);
}

router.get('/', function (req, res) {
    res.render('blog', {
        title: 'Blog - Aung Moe',
        description: 'Aung\'s personal website',
        css: [global.css.material_icons, '/css/blog.css', global.css.animate_css, global.css.fontawesome],
        js: [global.js.jquery, global.js.materialize, global.js.header, '/js/index.js', global.js.footer],
        pages: sortedPages
    });
});

router.get('/:category/:year/:month/:day/:title', function (req, res, next) {
    var url = `${req.params['category']}/${req.params['year']}/${req.params['month']}/${req.params['day']}/${req.params['title']}`;
    if (url != null && pages[url] != null) {
        var page = pages[url];
        res.render('blogtemplate', {
            title: `${page.title} - Aung Moe`,
            description: 'Aung\'s personal website',
            css: [global.css.material_icons, '/css/blogtemplate.css', global.css.animate_css, global.css.fontawesome],
            js: [global.js.jquery, global.js.materialize, global.js.header, '/js/blogtemplate.js', global.js.footer],
            page: page
        });
    } else {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    }
});

module.exports = router;