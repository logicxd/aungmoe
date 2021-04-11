"use strict";

/* #region  Imports */
var express = require('express');
var router = express.Router();
var path = require('path');
var utility = require('../utility')
var { body, validationResult } = require('express-validator');

// Text parser
var rp = require('request-promise');
var unfluff = require('unfluff');
var cheerio = require('cheerio');
var readControllerUtility = require('../read/read-controller-utility')

require('../../database/model/User')
var BookmarkModel = require('../../database/model/Bookmark')
var WebsiteModel = require('../../database/model/Website')
/* #endregion */

var route = 'bookmark'
utility.setupRouterPaths(router, __dirname)

router.get('/', async function (req, res) {
    if (req.isAuthenticated()) {
        console.log(`authenticated, ${req.user}`)

        return res.render(path.join(__dirname, 'view/bookmark'), {
            title: 'Bookmark - Aung Moe',
            description: 'Bookmark',
            css: [`${route}/css/bookmark.css`],
            js: [`${route}/js/bookmark.js`],
            bookmarks: [{
                img: 'https://kissmanga.org/mangaimage/al925871.jpg',
                title: 'Some Book Title',
                lastReadTitle: 'Chapter 123',
                lastReadUrl: 'https://www.google.com',
                nextChapterTitle: 'Chapter 124',
                nextChapterUrl: 'https://www.google.com'
            }, {
                img: 'https://kissmanga.org/mangaimage/al925871.jpg',
                title: 'Some Book Title',
                lastReadTitle: 'Chapter 123',
                lastReadUrl: 'https://www.google.com',
                // nextChapterTitle: 'Chapter 124',
                // nextChapterUrl: 'https://www.google.com'
            }, {
                img: 'https://kissmanga.org/mangaimage/al925871.jpg',
                title: 'Some Book Title',
                lastReadTitle: 'Chapter 123',
                lastReadUrl: 'https://www.google.com',
                nextChapterTitle: 'Chapter 124',
                nextChapterUrl: 'https://www.google.com'
            }]
        })
    }
    return res.redirect(`/login?redirectUrl=${route}`)
})

router.post('/', [
    body('title').trim().notEmpty(),
    body('imageUrl').isURL(),
    body('url').isURL(),
    body('type').toLowerCase().custom(value => {
        const validEnums = ['webtoon', 'novel']
        if (validEnums.includes(value)) {
            return true
        }
        throw new Error(`type must be one of [${validEnums}]`)
    })
], async function (req, res) {
    if (!req.isAuthenticated()) {
        return res.status(403).end()
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const bookmark = await BookmarkModel.findOne({ title: req.body.title })
        if (bookmark) {
            return res.status(409).send('Bookmark with this title already exists')
        }

        const url = (new URL(req.body.url)).origin
        let website = await WebsiteModel.findOne({ url: url })
        if (!website) {
            website = await WebsiteModel.create({ url: url })
        }

        // let lastReadTitle = await findTitle(req.body.url) ?? req.body.url
        let lastReadTitle = req.body.url

        await BookmarkModel.create({
            user: req.user,
            website: website,
            title: req.body.title,
            imageUrl: req.body.imageUrl,
            lastReadTitle: lastReadTitle,
            lastReadUrl: req.body.url,
            type: req.body.type
        })
        return res.status(200).end()
    } catch (error) {
        console.error(error)
        return res.status(500).send('Unhandled exception')
    }
})

/* #region  Helper Methods */
async function findTitle(url) {
    try {
        var html = await rp(url)
        var loadedCheerio = cheerio.load(html)
        var data = unfluff(html);
        var textTitles = readControllerUtility.findTextTitle(data.title, loadedCheerio);
        return textTitles.length > 0 ? textTitles[0] : null
    } catch (error) {
        console.log(error);
        return null
    }
}


// // Create an instance of model SomeModel
// var user = new UserModel({ username: 'test12345', fullName: 'David' });

// UserModel.register(user, 'uniquepass', err => {
//     if (err) {
//         console.error(err.message)
//         return
//     }
//     console.log('user registered')
//     // saved!    
// })

/* #endregion */
module.exports = router