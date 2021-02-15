"use strict";
var express = require('express');
var router = express.Router();
var rp = require('request-promise');
var unfluff = require('unfluff');
var cheerio = require('cheerio');
var loadedCheerio = null;
var utility = require('../utility')
var path = require('path');

var route = 'read-novel'
utility.setupRouterPaths(router, __dirname)

router.get('/', async function (req, res) {
    if (req.query.url) {
        await loadReadPage(req, res);
    } else {
        loadSetupPage(req, res);
    }
});

function loadSetupPage(req, res) {
    res.render(path.join(__dirname, 'view/read-tool'), {
        title: 'Reading Tool - Aung Moe',
        description: 'Aung\'s personal website',
        css: [global.css.material_icons, `${route}/css/read.css`, global.css.animate_css, global.css.fontawesome],
        js: [global.js.jquery, global.js.materialize, global.js.header, `${route}/js/read.js`, global.js.footer]
    });
}

async function loadReadPage(req, res) {
    var html = '';
    loadedCheerio = null;
    try {
        html = await rp(req.query.url);
    } catch (error) {
        console.log(error);
        html = '';
    }
    
    var data = unfluff(html);
    var textTitles = findTextTitle(data.title, html);
    var paragraphs = data.text.split('\n\n');
    var nextPageLink = findNextPageLinkUsingUnfluff(data.links);
    nextPageLink = nextPageLink === '' ? findNextPageLinkUsingCheerio(html) : nextPageLink;
    nextPageLink = turnURLIntoAbsolutePathIfNeeded(nextPageLink, req.query.url);

    res.render(path.join(__dirname, 'view/read'), {
        title: `${data.title || 'Unknown'} - Aung Moe`,
        description: 'Aung\'s personal website',
        css: [global.css.material_icons, `${route}/css/read.css`, global.css.animate_css, global.css.fontawesome],
        js: [global.js.jquery, global.js.materialize, global.js.header, `${route}/js/read.js`, global.js.footer],
        textTitle: textTitles[0],
        textAlternativeTitles: getAlternativeTitleString(textTitles),
        textParagraphs: paragraphs,
        didError: html === '',
        currentPageLink: req.query.url,
        nextPageLink: nextPageLink
    });
}

// returns an array of ['Text Title', 'Alt. title 1', 'Alt. Title 2', ...]
function findTextTitle(unfluffTitle, html) {
    loadedCheerio = loadedCheerio == null ? cheerio.load(html) : loadedCheerio;
    var titleCandidates = [unfluffTitle];
    var selectors = ['h1', 'h2', 'h3', 'p:contains("Chapter")'];
    var textTitles = [unfluffTitle];
    var subTitleSet = new Set([unfluffTitle]); 
    try {
        // Grab possible content titles from `selectors` elements
        for (var i = 0; i < selectors.length; ++i) {
            loadedCheerio(selectors[i]).contents().each(function(i, node) {
                if (node.data != null) {
                    var title = node.data.trim();
                    if (title.length > 0) {
                        titleCandidates.push(title);

                        // 'h1' selectors are added as alternative title
                        if (selectors[i] === 'h1') {
                            subTitleSet.add(title);
                        }
                    }
                }
            });
        }
        // Determine text title
        titleCandidates.forEach(title => {
            var useTitle = title.length >= textTitles[0].length;
            useTitle &= title.toLowerCase().includes('chapter');
            if (useTitle) {
                textTitles[0] = title;
            }
        });
        subTitleSet.delete(textTitles[0]);
        subTitleSet.forEach(subTitle => {
            textTitles.push(subTitle);
        });
    } catch (error) {
        console.error(error);
        textTitles = [unfluffTitle];
    }
    return textTitles;
}

function getAlternativeTitleString(textTitles) {
    var titles = textTitles.slice(1);
    var titleString = '';
    for (var i = 0; i < titles.length && i < 5; ++i) {
        titleString += `${i>0 ? ',' : ''} ${titles[i]}`;
    }
    return titleString;
}

function findNextPageLinkUsingUnfluff(links) {
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

function findNextPageLinkUsingCheerio(html) {
    loadedCheerio = loadedCheerio == null ? cheerio.load(html) : loadedCheerio;
    var linkContents = loadedCheerio('a').contents();
    var link = '';
    try {
        for (var i = linkContents.length - 1; i >= 0; --i) {
            var node = linkContents.get(i);
            var foundNextLink = findNextPageLinkUsingCheerio_CheckForCurrentNodeData(node);
            foundNextLink = foundNextLink || findNextPageLinkUsingCheerio_CheckForChildrenNodeData(node);

            if (foundNextLink) {
                link = node.parent.attribs.href;
                break;
            }
        }
    } catch (error) {
        console.error(error);
    }
    return link;
}

function findNextPageLinkUsingCheerio_CheckForCurrentNodeData(node) {
    var nodeText = node.data;
    nodeText = nodeText == null ? '' : nodeText.toLowerCase();
    return nodeText.includes('next')
}

function findNextPageLinkUsingCheerio_CheckForChildrenNodeData(node) {
    if (!node.children) { return false; }

    for (var i = 0; i < node.children.length; ++i) {
        var childNode = node.children[i];

        if (!childNode.data) { 
            continue; 
        }
        if (childNode.data.toLowerCase().includes('next')) {
            return true;
        }
    }
    return false;
}

function turnURLIntoAbsolutePathIfNeeded(link, currentUrl) {
    if (link === '' || isAbsoluteLink(link)) {
        return link;
    }

    var url = new URL(currentUrl);
    url.pathname = link;
    return url.toString();
}

function isAbsoluteLink(link) {
    var r = new RegExp('^(?:[a-z]+:)?//', 'i');
    return r.test(link);
}

module.exports = router;