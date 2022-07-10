"use strict";

/* #region  Imports */
var express = require('express');
var router = express.Router();
var path = require('path');
var utility = require('../utility')
var axios = require('axios')
var { body, validationResult } = require('express-validator');
var appDir = path.dirname(require.main.filename);
var secrets = {}
try {
    secrets = require(path.join(appDir, 'config/secrets.json'))    
} catch (error) {
    // Do nothing. Server should handle loading of the configs
}
let yelpAPI = process.env.YELP_API || secrets.YELP_API

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
            databaseId: req.body.databaseId,
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
        id: id
    })
})
/* #endregion */

/* #region  GET /map-it-notion/render/{id} */
router.get('/render/:id', async function (req, res) {
    let id = req.params['id']

    let notionMap = {}
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
    
    return res.render(path.join(__dirname, 'view/map-it-notion-render'), {
        title: `Map It Notion - ${notionMap.title}`,
        layout: "empty-template",
        description: 'Map Notion database onto Google Maps',
        css: [`/${route}/css/map-it-notion.css`],
        js: [global.js.googleMaps, `/${route}/js/map-it-notion.js`, `/${route}/js/map-it-notion-detail.js`, `/${route}/js/map-it-notion-map.js`],
        id: id
    })
})
/* #endregion */

/* #region  GET /map-it-notion/map-data/{id} */
router.get('/map-data/:id', async function (req, res) {
    let id = req.params['id']
    let mapObjects = await mapDataForId(id)
    return res.send(mapObjects)
})
/* #endregion */

/* #region  Helper Methods */

async function mapDataForId(id) {
    try {
        let notionMap = await NotionMapModel.findById(new mongoose.Types.ObjectId(id))
        if (!notionMap) {
            throw `Notion map not found with id ${id}`
        }
    
        let fetchFromNotion = false
        if (fetchFromNotion) {
            let notionRawResponse = await notionFetchDataFromTable(notionMap.secretKey, notionMap.databaseId)
            let locations = notionExtractLocations(notionRawResponse.data)
            await getCoordinatesFromYelp(locations)
            notionMap.buildings = locations 
            await notionMap.save()
        }
        return notionMap.buildings
    } catch (error) {
        console.error(`Error fetching map-data for notion: ${error}`)
        return []
    }
}

function requiredNotionMapValidators() {
    return [
        body('title').trim().notEmpty(),
        body('secretKey').trim().notEmpty()
    ]
}

/* #endregion */


/* #region  Notion API */

async function notionFetchDataFromTable(apiKey, databaseId) {
    const options = {
        method: 'POST',
        url: `https://api.notion.com/v1/databases/${databaseId}/query`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Notion-Version': '2022-02-22',
            'Content-Type': 'application/json'
        },
        data: {page_size: 100}
    }

    let res = await axios(options)
    return res
}

function notionExtractLocations(data) {
    let mapObjects = [] 
    for (let result of data.results) { 
        let properties = result.properties

        let mapObject = {
            latitude: properties.Latitude.number,
            longitude: properties.Longitude.number
        }

        if (properties.Name.title != null && properties.Name.title.length > 0) {
            mapObject.title = properties.Name.title[0].plain_text
            mapObject.info = mapObject.title
        }

        if (properties.Yelp.url != null && properties.Yelp.url.length > 0) {
            try {
                let url = new URL(properties.Yelp.url)
                let path = url.pathname
                let pathSplit = path.split('/')
                let id = pathSplit[pathSplit.length - 1]
                mapObject.yelp = url
                mapObject.yelpId = id
            } catch (error) {
                // Invalid URL
                console.log(`Invalid yelp url: ${properties.Yelp.url}`)
            }
        }

        mapObjects.push(mapObject)
    }
    return mapObjects
}

/* #endregion */

/* #region  Yelp API */

async function getCoordinatesFromYelp(locations) {
    for (let location of locations) {

        if (location.yelpId == null || location.yelpId.length == 0) {
            continue
        }

        let yelpRawResponse = await yelpFetchBusinessFromId(location.yelpId)
        let yelpObject = yelpExtractDataForMap(yelpRawResponse.data)
        location.latitude = yelpObject.latitude
        location.longitude = yelpObject.longitude
    }
}

async function yelpFetchBusinessFromId(businessId) {
    const options = {
        method: 'GET',
        url: `https://api.yelp.com/v3/businesses/${businessId}`,
        headers: {
            'Authorization': `Bearer ${yelpAPI}`,
            'Accept': 'application/json'
        }
    }
    
    let res = await axios(options)
    return res
}

function yelpExtractDataForMap(data) {
    let yelpObject = {
        latitude: data.coordinates.latitude,
        longitude: data.coordinates.longitude
    }
    return yelpObject
}

/* #endregion */

module.exports = router