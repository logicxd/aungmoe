"use strict";

/* #region  Imports */
var express = require('express');
var router = express.Router();
var rp = require('request-promise');
var unfluff = require('unfluff');
var cheerio = require('cheerio');
var controllerUtility = require('../../utility')
var readControllerUtility = require('../read-controller-utility')
var readNovelService = require('./service/read-novel-service')
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
    const chaptersToLoad = parseInt(req.query.chaptersPerPage) || 1;
    const validatedChaptersToLoad = Math.min(Math.max(chaptersToLoad, 1), 5);

    let chapters = [];
    try {
        chapters = await readNovelService.fetchMultipleChapters(req.query.url, validatedChaptersToLoad);
        if (chapters.length === 0) {
            throw new Error('No chapters could be fetched');
        }
    } catch (error) {
        console.log(error);
        res.render('error', {
            title: '400 - Aung Moe',
            description: 'Something went wrong!',
            css: ['/css/default.css']
        });
        return;
    }

    const processedChapters = preprocessChaptersWithGlobalIds(chapters);
    const firstChapter = chapters[0];
    const lastChapter = chapters[chapters.length - 1];
    const skipAheadUrl = lastChapter.nextPageLink;

    await readControllerUtility.updateBookmarkIfNeeded(
        req,
        req.query.bookmark,
        firstChapter.title,
        req.query.url,
        skipAheadUrl
    );

    res.render(path.join(__dirname, 'view/read'), {
        title: `${firstChapter.title || 'Unknown'} - Aung Moe`,
        description: `${firstChapter.title}`,
        css: [`${route}/css/read.css`, global.css.animate_css],
        js: [`${route}/js/read.js`, global.js.noSleep],
        chapters: processedChapters,
        didError: false,
        currentPageLink: req.query.url,
        nextPageLink: skipAheadUrl,
        bookmark: req.query.bookmark
    });
}

/**
 * Pre-processes chapters to add global paragraph IDs
 * @param {Array} chapters - Array of chapter objects
 * @returns {Array} - Processed chapters with paragraphs containing global IDs
 */
function preprocessChaptersWithGlobalIds(chapters) {
    let globalParagraphIndex = 0;

    return chapters.map(chapter => {
        const paragraphsWithIds = chapter.paragraphs.map(text => {
            return {
                text: text,
                globalId: globalParagraphIndex++
            };
        });

        return {
            title: chapter.title,
            alternativeTitles: chapter.alternativeTitles,
            paragraphs: paragraphsWithIds,
            nextPageLink: chapter.nextPageLink
        };
    });
}
/* #endregion */

module.exports = router;