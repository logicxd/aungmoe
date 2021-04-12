"use strict";

/* #region  Imports */
var express = require('express');
var router = express.Router();
var path = require('path');
var utility = require('../utility')
var { body, validationResult } = require('express-validator');

// Text parser
var readControllerUtility = require('../read/read-controller-utility')

var UserModel = require('../../database/model/User')
var BookmarkModel = require('../../database/model/Bookmark')
var WebsiteModel = require('../../database/model/Website')
/* #endregion */

var route = 'bookmark'
utility.setupRouterPaths(router, __dirname)

router.get('/', async function (req, res) {
    if (!req.isAuthenticated()) {
        return res.redirect(`/login?redirectUrl=${route}`)
    }

    let bookmarks = [{
        imageUrl: 'https://kissmanga.org/mangaimage/al925871.jpg',
        title: 'Some Book Title',
        lastReadTitle: 'Chapter 123',
        lastReadUrl: 'https://www.google.com',
        nextChapterTitle: 'Chapter 124',
        nextChapterUrl: 'https://www.google.com'
    }, {
        imageUrl: 'https://kissmanga.org/mangaimage/al925871.jpg',
        title: 'Some Book Title',
        lastReadTitle: 'Chapter 123',
        lastReadUrl: 'https://www.google.com',
        // nextChapterTitle: 'Chapter 124',
        // nextChapterUrl: 'https://www.google.com'
    }, {
        imageUrl: 'https://kissmanga.org/mangaimage/al925871.jpg',
        title: 'Some Book Title',
        lastReadTitle: 'Chapter 123',
        lastReadUrl: 'https://www.google.com',
        nextChapterTitle: 'Chapter 124',
        nextChapterUrl: 'https://www.google.com'
    }]

    try {
        bookmarks = await BookmarkModel.find({ user: req.user }).sort({ modifiedDate: 'desc' }).lean()
        bookmarks = bookmarks.map(x => {
            x.lastReadUrl = `/read-${x.type}?url=${x.lastReadUrl}&bookmark=${x._id.toString()}`
            if (x.nextChapterUrl) {
                x.nextChapterUrl = `/read-${x.type}?url=${x.nextChapterUrl}&bookmark=${x._id.toString()}`
            }
            return x
        })
    } catch (error) {
        console.error(error)
    }

    return res.render(path.join(__dirname, 'view/bookmark'), {
        title: 'Bookmark - Aung Moe',
        description: 'Bookmark',
        css: [`${route}/css/bookmark.css`],
        js: [`${route}/js/bookmark.js`],
        bookmarks: bookmarks
    })
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
        return res.status(403).send("You're not signed in, please sign in again.")
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const bookmark = await BookmarkModel.findOne({ user: req.user, title: req.body.title })
        if (bookmark) {
            return res.status(409).send('Bookmark with this title already exists')
        }

        const url = (new URL(req.body.url)).origin
        let website = await WebsiteModel.findOne({ url: url })
        if (!website) {
            website = await WebsiteModel.create({ url: url })
        }

        // TODO: re-enable fetching the URL after test is over
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
        return res.status(204).end()
    } catch (error) {
        console.error(error)
        return res.status(500).send('Unhandled exception')
    }
})

router.patch('/check-updates', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(403).send("You're not signed in, please sign in again.")
    }

    try {
        let bookmarks = await BookmarkModel.find({ user: req.user, nextChapterUrl: null })
        let numOfBookmarksUpdated = 0
        for (let bookmark of bookmarks) {
            var nextPageLink = await readControllerUtility.findNextPageLinkWithUrl(bookmark.lastReadUrl)
            if (nextPageLink) {
                // This works but I want to reduce API hits so will replace it with static chapter
                // var nextPageTitle = await readControllerUtility.findTextTitleWithUrl(nextPageLink)
                var nextPageTitle = 'Next Chapter'

                await readControllerUtility.updateBookmarkWithNextChapterInfo(bookmark, nextPageTitle, nextPageLink)
                numOfBookmarksUpdated++
            }
        }
        return res.status(200).send(`${numOfBookmarksUpdated}`)
    } catch (error) {
        console.error(error)
        return res.status(500).send('Unhandled exception')
    }
})

/* #region  Helper Methods */

// p_createUser()
// function p_createUser() {
//     // Create an instance of model SomeModel
//     var user = new UserModel({ username: 'test12345', fullName: 'David' });

//     UserModel.register(user, 'uniquepass', err => {
//         if (err) {
//             console.error(err.message)
//             return
//         }
//         console.log('user registered')
//         // saved!    
//     })
// }

/* #endregion */
module.exports = router