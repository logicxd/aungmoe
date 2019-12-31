"use strict";
var express = require('express');
var router = express.Router();
var rp = require('request-promise');
var unfluff = require('unfluff');
var hljs = require('highlight.js');

router.get('/', async function (req, res) {
    if (req.query.url) {
        await loadReadPage(req, res);
    } else {
        loadSetupPage(req, res);
    }
});

function loadSetupPage(req, res) {
    res.render('read-tool', {
        title: 'Read Tool - Aung Moe',
        description: 'Aung\'s personal website',
        css: [global.css.material_icons, '/css/read.css', global.css.animate_css, global.css.fontawesome],
        js: [global.js.jquery, global.js.materialize, global.js.header, '/js/read.js', global.js.footer]
    });
}

async function loadReadPage(req, res) {
    var html = '';
    try {
        html = await rp(req.query.url);
    } catch (error) {
        console.log(error);
        html = '';
    }
    
    var data = unfluff(html);
    var paragraphs = data.text.split('\n\n');
    var title = data.title || 'Error';
    var nextPageLink = findNextPageLink(data.links);
    nextPageLink = turnURLIntoAbsolutePathIfNeeded(nextPageLink, req.query.url);

    res.render('read', {
        title: `${title} - Aung Moe`,
        description: 'Aung\'s personal website',
        css: [global.css.material_icons, '/css/read.css', global.css.animate_css, global.css.fontawesome],
        js: [global.js.jquery, global.js.materialize, global.js.header, '/js/read.js', global.js.footer],
        textTitle: title,
        textParagraphs: paragraphs,
        didError: html === '',
        currentPageLink: req.query.url,
        nextPageLink: nextPageLink
    });
}

function findNextPageLink(links) {
    var link = '';
    for (var i = links.length - 1; i >= 0; --i ) {
        var linkObject = links[i];
        var linkText = linkObject.text.toLowerCase();
        if (linkText.includes('next')) {
            link = linkObject.href;
            break;
        }
    }
    return link;
}

function turnURLIntoAbsolutePathIfNeeded(link, currentUrl) {
    if (link === '' || isAbsoluteLink(link)) {
        return link;
    }

    var tokenizeCurrentUrl = currentUrl.split('/').reverse();
    var tokenizeLink = link.split('/').reverse();
    var newLink = '';
    var isFirst = 0;
    while (tokenizeLink.length > 0) {
        if (tokenizeCurrentUrl.length > tokenizeLink.length) {
            newLink += (isFirst++ === 0 ? '' : '/') + tokenizeCurrentUrl.pop(); 
        } else {
            newLink += `/${tokenizeLink.pop()}`;
        }
    }
    return newLink;
}

function isAbsoluteLink(link) {
    var r = new RegExp('^(?:[a-z]+:)?//', 'i');
    return r.test(link);
}

module.exports = router;