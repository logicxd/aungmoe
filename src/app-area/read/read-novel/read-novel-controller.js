"use strict";

/* #region  Imports */
var express = require('express');
var router = express.Router();
var rp = require('request-promise');
var unfluff = require('unfluff');
var cheerio = require('cheerio');
var controllerUtility = require('../../utility')
var readControllerUtility = require('../read-controller-utility')
var path = require('path');
/* #endregion */

var route = 'read-novel'
var loadedCheerio = null;
controllerUtility.setupRouterPaths(router, __dirname)

router.get('/', async function (req, res) {
    if (req.query.url) {
        await loadReadPage(req, res);
    } else {
        loadSetupPage(req, res);
    }
});

/* #region  Setup Page */
function loadSetupPage(req, res) {
    res.render(path.join(__dirname, 'view/read-setup'), {
        title: 'Read Novel - Aung Moe',
        description: 'Novel Reading Tool',
        css: [`${route}/css/read.css`],
        js: [`${route}/js/read.js`]
    });
}
/* #endregion */

/* #region  Novel Read Page */
async function loadReadPage(req, res) {
    var html = '';
    try {
        html = await rp(req.query.url)
        loadedCheerio = cheerio.load(html)
    } catch (error) {
        console.log(error);
        html = '';
    }

    var data = unfluff(html);
    var textTitles = readControllerUtility.findTextTitle(data.title, loadedCheerio);
    var paragraphs = data.text.split('\n\n')
    var nextPageLink = readControllerUtility.findNextPageLink(data.links, loadedCheerio, req.query.url)

    res.render(path.join(__dirname, 'view/read'), {
        title: `${data.title || 'Unknown'} - Aung Moe`,
        description: `${data.title}`,
        css: [`${route}/css/read.css`],
        js: [`${route}/js/read.js`],
        textTitle: textTitles[0],
        textAlternativeTitles: readControllerUtility.getAlternativeTitleString(textTitles),
        textParagraphs: paragraphs,
        didError: html === '',
        currentPageLink: req.query.url,
        nextPageLink: nextPageLink
    });
}
/* #endregion */

module.exports = router;