"use strict";

/* #region  Imports */
var express = require('express');
var router = express.Router();
var path = require('path');
var utility = require('../utility')
var { body, validationResult } = require('express-validator');

// Text parser
var UserModel = require('../../database/model/User')
var NotionMapModel = require('../../database/model/NotionMap')
/* #endregion */

/* #region  Set up routes */
var route = 'map-it-notion'
utility.setupRouterPaths(router, __dirname)
/* #endregion */

/* #region  GET /map-it-notion */
router.get('/', async function (req, res) {
    if (!req.isAuthenticated()) {
        return res.redirect(`/login?redirectUrl=${route}`)
    }

    let notionMaps = []
    try {
        let dbMaps = await NotionMapModel.find({ user: req.user }).sort({ modifiedDate: 'desc' }).lean()
        notionMaps = dbMaps.map(x => {
            let notionMap = {
                title: x.title, 
                url: `${route}/${x._id.toString()}`
            }
            return notionMap
        })
    } catch (error) {
        console.error(error)
    }

    return res.render(path.join(__dirname, 'view/map-it-notion'), {
        title: 'Map It Notion - Aung Moe',
        description: 'Map Notion database onto Google Maps',
        css: [`${route}/css/map-it-notion.css`],
        js: [`${route}/js/map-it-notion.js`],
        notionMaps: notionMaps
    })
})
/* #endregion */

/* #region  POST /map-it-notion */
router.post('/', requiredNotionMapValidators(), async function (req, res) {
    if (!req.isAuthenticated()) {
        return res.status(403).send("You're not signed in, please sign in again.")
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        let notionMap = await NotionMapModel.create({
            user: req.user,
            title: req.body.title,
            secretKey: req.body.secretKey
        })
        return res.status(204).end()
    } catch (error) {
        console.error(error)
        return res.status(500).send('Unhandled exception')
    }
})
/* #endregion */

/* #region  Helper Methods */

function requiredNotionMapValidators() {
    return [
        body('title').trim().notEmpty(),
        body('secretKey').trim().notEmpty()
    ]
}

/* #endregion */

module.exports = router