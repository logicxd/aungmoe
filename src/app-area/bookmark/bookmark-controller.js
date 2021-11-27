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

/* #region  Set up routes */
var route = 'bookmark'
utility.setupRouterPaths(router, __dirname)
/* #endregion */

/* #region  GET /bookmark */
router.get('/', async function (req, res) {
    if (!req.isAuthenticated()) {
        return res.redirect(`/login?redirectUrl=${route}`)
    }

    let bookmarks = []
    try {
        bookmarks = await BookmarkModel.find({ user: req.user }).sort({ modifiedDate: 'desc' }).lean()
        bookmarks = bookmarks.map(x => {
            x.id = x._id.toString()
            x.lastReadUrlFormatted = `/read-${x.type}?url=${x.lastReadUrl}&bookmark=${x._id.toString()}`
            if (x.nextChapterUrl) {
                x.nextChapterUrlFormatted = `/read-${x.type}?url=${x.nextChapterUrl}&bookmark=${x._id.toString()}`
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
/* #endregion */

/* #region  POST /bookmark */
router.post('/', requiredBookmarkValidators(), async function (req, res) {
    if (!req.isAuthenticated()) {
        return res.status(403).send("You're not signed in, please sign in again.")
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        let bookmark = await BookmarkModel.findOne({ user: req.user, title: req.body.title })
        if (bookmark) {
            return res.status(409).send('Bookmark with this title already exists')
        }

        const websiteUrl = (new URL(req.body.url)).origin
        let website = await WebsiteModel.findOne({ url: websiteUrl })
        if (!website) {
            website = await WebsiteModel.create({ url: websiteUrl })
        }

        let lastReadTitle = await readControllerUtility.findTextTitleWithUrl(req.body.url) ?? req.body.url

        bookmark = await BookmarkModel.create({
            user: req.user,
            website: website,
            title: req.body.title,
            imageUrl: req.body.imageUrl,
            lastReadTitle: lastReadTitle,
            lastReadUrl: req.body.url,
            type: req.body.type
        })

        let nextPageLink = await readControllerUtility.findNextPageLinkWithUrl(req.body.url)
        if (nextPageLink) {
            // This works but I want to reduce API hits so will replace it with static chapter
            // var nextPageTitle = await readControllerUtility.findTextTitleWithUrl(nextPageLink)
            var nextPageTitle = 'Next Chapter'
            await readControllerUtility.updateBookmarkWithNextChapterInfo(bookmark, nextPageTitle, nextPageLink)
        }

        return res.status(204).end()
    } catch (error) {
        console.error(error)
        return res.status(500).send('Unhandled exception')
    }
})
/* #endregion */

/* #region  PUT /bookmark */
router.put('/', [
    body('bookmarkId').notEmpty(),
    ...requiredBookmarkValidators()
], async function (req, res) {
    if (!req.isAuthenticated()) {
        return res.status(403).send("You're not signed in, please sign in again.")
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        let bookmark = await BookmarkModel.findById(req.body.bookmarkId)
        if (!bookmark || bookmark.user._id.toString() !== req.user.id) {
            return res.status(403).send('Unauthorized access')
        }

        const websiteUrl = (new URL(req.body.url)).origin
        let website = await WebsiteModel.findOne({ url: websiteUrl })
        if (!website) {
            website = await WebsiteModel.create({ url: websiteUrl })
        }

        let lastReadTitle = await readControllerUtility.findTextTitleWithUrl(req.body.url) ?? req.body.url

        bookmark.website = website
        bookmark.title = req.body.title
        bookmark.imageUrl = req.body.imageUrl
        bookmark.lastReadTitle = lastReadTitle,
            bookmark.lastReadUrl = req.body.url,
            bookmark.type = req.body.type
        await bookmark.save()

        let nextPageLink = await readControllerUtility.findNextPageLinkWithUrl(req.body.url)
        if (nextPageLink) {
            // This works but I want to reduce API hits so will replace it with static chapter
            // var nextPageTitle = await readControllerUtility.findTextTitleWithUrl(nextPageLink)
            var nextPageTitle = 'Next Chapter'
            await readControllerUtility.updateBookmarkWithNextChapterInfo(bookmark, nextPageTitle, nextPageLink)
        }

        return res.status(204).end()
    } catch (error) {
        console.error(error)
        return res.status(500).send('Unhandled exception')
    }
})
/* #endregion */

/* #region  PATCH /bookmark/check-updates */
router.patch('/check-updates', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(403).send("You're not signed in, please sign in again.")
    }

    try {
        let bookmarks = await BookmarkModel.find({ user: req.user, nextChapterUrl: { "$in": [null, ""] } })
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
/* #endregion */

/* #region  Helper Methods */

function requiredBookmarkValidators() {
    return [
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
    ]
}

/* #endregion */

module.exports = router