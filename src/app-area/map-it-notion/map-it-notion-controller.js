"use strict";

/* #region  Imports */
var express = require('express');
var router = express.Router();
var path = require('path');
var utility = require('../utility')
var axios = require('axios')
var { body, validationResult } = require('express-validator');

// Text parser
var UserModel = require('../../database/model/User')
var NotionMapModel = require('../../database/model/NotionMap')
var mongoose = require('mongoose');
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

/* #region  GET /map-it-notion/{id} */
router.get('/:id', async function (req, res) {
    let id = req.params['id']

    let notionMap = {}
    let notionLocations = []
    try {
        let notionMap = await NotionMapModel.findById(new mongoose.Types.ObjectId(id))

        if (!notionMap) {
            throw `Notion map not found with id ${id}`
        }

    } catch (error) {
        console.error(error)
        res.status(404)
        return res.render(path.join(__dirname, 'view/map-it-notion-unknown-page'), {
            title: 'Map It Notion - Not Found',
            description: 'Map not found!',
            css: [`/${route}/css/map-it-notion.css`],
            js: [`/${route}/js/map-it-notion.js`]
        });
    }
    
    return res.render(path.join(__dirname, 'view/map-it-notion-detail'), {
        title: `Map It Notion - ${notionMap.title}`,
        description: 'Map Notion database onto Google Maps',
        css: [`/${route}/css/map-it-notion.css`],
        js: [global.js.googleMaps, `/${route}/js/map-it-notion.js`, `/${route}/js/map-it-notion-detail.js`, `/${route}/js/map-it-notion-map.js`],
        notionLocations: notionLocations
    })
})
/* #endregion */

/* #region  GET /map-it-notion/render/{id} */
router.get('/render/:id', async function (req, res) {
    let id = req.params['id']

    let notionMap = {}
    let notionLocations = []
    try {
        let notionMap = await NotionMapModel.findById(new mongoose.Types.ObjectId(id))
        if (!notionMap) {
            throw `Notion map not found with id ${id}`
        }
        fetchDataFromTable(notionMap.secretKey)

    } catch (error) {
        console.error(error)
        res.status(404)
        return res.render(path.join(__dirname, 'view/map-it-notion-unknown-page'), {
            title: 'Map It Notion - Not Found',
            description: 'Map not found!',
            css: [`/${route}/css/map-it-notion.css`],
            js: [`/${route}/js/map-it-notion.js`]
        });
    }
    
    return res.render(path.join(__dirname, 'view/map-it-notion-render'), {
        title: `Map It Notion - ${notionMap.title}`,
        layout: "empty-template",
        description: 'Map Notion database onto Google Maps',
        css: [`/${route}/css/map-it-notion.css`],
        js: [global.js.googleMaps, `/${route}/js/map-it-notion.js`, `/${route}/js/map-it-notion-detail.js`, `/${route}/js/map-it-notion-map.js`],
        notionLocations: notionLocations
    })
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


/* #region  Notion API */

function fetchDataFromTable(apiKey) {
    
    const options = {
        method: 'POST',
        url: 'https://api.notion.com/v1/databases/{database_id}/query',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Notion-Version': '2022-02-22',
            'Content-Type': 'application/json'
        },
        data: {page_size: 100}
    }

    axios
        .request(options)
        .then(response => {
            console.log(response.data)
        })
        .catch(error => {
            console.error(error)
        })
}
/* #endregion */

module.exports = router