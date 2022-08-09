"use strict";

/* #region  Imports */
var express = require('express')
var router = express.Router()
var rp = require('request-promise')
var unfluff = require('unfluff')
var cheerio = require('cheerio')
var controllerUtility = require('../../utility')
var readControllerUtility = require('../read-controller-utility')
var path = require('path')
/* #endregion */

var route = 'read-webtoon'
var loadedCheerio = null;
controllerUtility.setupRouterPaths(router, __dirname)

router.get('/', async function (req, res) {
    if (req.query.url) {
        await loadReadPage(req, res)
    } else {
        loadSetupPage(req, res)
    }
})

/* #region  Setup Page */
function loadSetupPage(req, res) {
    return res.render(path.join(__dirname, 'view/read-setup'), {
        title: 'Read Webtoon - Aung Moe',
        description: 'Webtoon Reading Tool',
        css: [`${route}/css/read.css`],
        js: [`${route}/js/read-utility.js`, `${route}/js/read-setup.js`]
    })
}
/* #endregion */

/* #region  Webtoon Read Page */
async function loadReadPage(req, res) {
    var html = '';
    try {
        html = await rp({
            url: req.query.url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36'
            },
            json: true
        })
        loadedCheerio = cheerio.load(html)
    } catch (error) {
        console.log(error);
        res.render('error', {
            title: '400 - Aung Moe',
            description: 'Something went wrong!',
            css: ['/css/default.css']
        });
        return
    }

    var data = unfluff(html)
    var textTitles = readControllerUtility.findTextTitle(data.title, loadedCheerio)
    var webtoonImages = findWebtoonImages(loadedCheerio)
    var nextPageLink = readControllerUtility.findNextPageLink(data.links, loadedCheerio, req.query.url)

    await readControllerUtility.updateBookmarkIfNeeded(req, req.query.bookmark, textTitles[0], req.query.url, nextPageLink)

    res.render(path.join(__dirname, 'view/read'), {
        title: `${data.title || 'Unknown'} - Aung Moe`,
        description: `${data.title}`,
        css: [`${route}/css/read.css`, global.css.animate_css],
        js: [`${route}/js/read-utility.js`, `${route}/js/read.js`, global.js.noSleep],
        textTitle: textTitles[0],
        textAlternativeTitles: readControllerUtility.getAlternativeTitleString(textTitles),
        webtoonImages: webtoonImages,
        didError: html === '',
        currentPageLink: req.query.url,
        nextPageLink: nextPageLink,
        bookmark: req.query.bookmark
    });
}

function findWebtoonImages(loadedCheerio) {
    let images = []
    let extensions = new Set(['png', 'jpg', 'jpeg', 'webp'])
    try {
        loadedCheerio('img').each((i, node) => {
            let attribs = node.attribs
            let imgUrl = null
            let keys = Object.keys(attribs)
            
            for (let key of keys) {
                let value = attribs[key]

                if (!value) {
                    continue
                }

                value = value.trim()
                let split = value.split('.')
                let extension = split[split.length-1]
                if (extensions.has(extension)) {
                    imgUrl = value
                    break
                }
            }
            
            if (imgUrl) {
                images.push(imgUrl)
            }
        })
    } catch (error) {
        console.error(error)
        images = []
    }
    return images
}
/* #endregion */

module.exports = router