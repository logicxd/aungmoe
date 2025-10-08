"use strict";

/* #region  Imports */
var express = require('express')
var router = express.Router()
var path = require('path')
var utility = require('../utility')
var googleApiService = require('../../services/googleapiservice')
var notionApi = require('../../services/notionapiservice')
var axios = require('axios')
var moment = require('moment')
var { body, param, validationResult } = require('express-validator')
let yelpAPI = process.env.YELP_API

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
        notionMap = await NotionMapModel.findById(new mongoose.Types.ObjectId(id))

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
        js: [global.js.axios, `/${route}/js/map-it-notion.js`, `/${route}/js/map-it-notion-detail.js`, `/${route}/js/map-it-notion-map.js`],
        shouldLoadGoogleMapsAPI: true,
        id: id
    })
})
/* #endregion */

/* #region  GET /map-it-notion/render/{id} */
router.get('/render/:id', async function (req, res) {
    let id = req.params['id']
    if (!mongoose.Types.ObjectId.isValid(id)) { return res.send(false) }

    let notionMap = {}
    try {
        notionMap = await NotionMapModel.findById(new mongoose.Types.ObjectId(id))
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
        js: [global.js.axios, `/${route}/js/map-it-notion.js`, `/${route}/js/map-it-notion-detail.js`, `/${route}/js/map-it-notion-map.js`],
        shouldLoadGoogleMapsAPI: true,
        id: id
    })
})
/* #endregion */

/* #region  GET /map-it-notion/map-data/{id} */
router.get('/map-data/:id', async function (req, res) {
    let id = req.params['id']
    let mapObjects = await mapDataForId(id)
    return res.send(Object.values(mapObjects))
})
/* #endregion */

/* #region  PUT /map-it-notion/map-data/{id}/refresh */

/// Updates everything in the database by fetching from Notion
router.put('/map-data/:id/refresh', async function (req, res) {
    try {
        let id = req.params['id']
        let notionMap = await NotionMapModel.findById(new mongoose.Types.ObjectId(id))
        if (!notionMap) {
            throw `Notion map not found with id ${id}`
        }

        let notionRawResponse = await notionFetchDataFromTable(notionMap.secretKey, notionMap.databaseId)
        let locations = notionExtractLocations(notionRawResponse.data)
        let locationsSinceLastSynced = getLocationsSinceLastSynced(locations, notionMap.lastSyncedDate)
        console.log(`Locations since last synced: ${Object.keys(locationsSinceLastSynced).length}`)

        await getInfoFromYelpIfNeeded(locationsSinceLastSynced)
        await getInfoFromGoogleMapIfNeeded(locationsSinceLastSynced)
        await updateNotionWithLatestInfo(notionMap.secretKey, locationsSinceLastSynced)
        console.log(`Locations: ${Object.values(locationsSinceLastSynced).map(x => x.title)}`)

        notionMap.buildings = updatedNotionMapBuildings(notionMap.buildings ?? {}, locationsSinceLastSynced)
        notionMap.markModified('buildings')
        notionMap.lastSyncedDate = new Date()
        await notionMap.save()
        return res.send(Object.values(locationsSinceLastSynced))
    } catch (error) {
        console.error(`Error updating Map it Notion ${error}`)
        return res.send([])
    }
})

function getLocationsSinceLastSynced(locations, lastSyncedDate) {
    let lastSynced = moment(lastSyncedDate)
    // lastSynced = lastSynced.subtract(1, 'month')
    if (!lastSynced.isValid()) { return locations }

    let newLocations = {}
    for (let [key, location] of Object.entries(locations)) {
        let date = moment(location.lastEdited)
        if (date.isValid() && date.isSameOrAfter(lastSynced, 'minute') && location.synced === false) {
            newLocations[location.id] = location
        }
    }
    return newLocations
}

function updatedNotionMapBuildings(notionMapBuildings, locationsSinceLastSynced) {
    for (let [key, location] of Object.entries(locationsSinceLastSynced)) {
        notionMapBuildings[key] = location
    }
    return notionMapBuildings
}

async function updateNotionWithLatestInfo(apiKey, locationsSinceLastSynced) {
    for (let [key, location] of Object.entries(locationsSinceLastSynced)) {
        if (location.latitude != null && location.longitude != null) {
            try {
                await notionUpdateWithLocation(apiKey, location)
            } catch (error) {
                console.log(`Failed updating notion with latest info: ${error}`)
            }
        }
    }
}

/* #endregion */

/* #region  PUT /map-it-notion/map-data/{id}/cleanup */

// Remove anything that was previously added but was deleted in Notion
router.put('/map-data/:id/cleanup', async function (req, res) {
    try {
        let id = req.params['id']
        let notionMap = await NotionMapModel.findById(new mongoose.Types.ObjectId(id))
        if (!notionMap) {
            throw `Notion map not found with id ${id}`
        }

        let notionRawResponse = await notionFetchDataFromTable(notionMap.secretKey, notionMap.databaseId)
        let locations = notionExtractLocations(notionRawResponse.data)

        for (let [key, location] of Object.entries(notionMap.buildings)) {
            if (locations[key] == null) {
                delete notionMap.buildings[key]
                console.log(`  Removing ${location.title}`)
            }
        }

        notionMap.markModified('buildings')
        notionMap.lastSyncedDate = new Date()
        await notionMap.save()
        return res.send([])
    } catch (error) {
        console.error(`Error cleaning up Map it Notion ${error}`)
        return res.send([])
    }
})
/* #endregion */

/* #region  PUT /map-it-notion/map-data/{id}/bounds */

/// Updates everything in the database by fetching from Notion
router.put('/map-data/:id/bounds', async function (req, res) {
    try {
        let id = req.params['id']
        let mapBounds = req.body

        let notionMap = await NotionMapModel.findById(new mongoose.Types.ObjectId(id))
        if (!notionMap) {
            throw `Notion map not found with id ${id}`
        }

        notionMap.mapBounds = mapBounds
        notionMap.markModified('mapBounds')
        await notionMap.save()
        return res.send(true)
    } catch (error) {
        return res.send(false)
    }
})

/* #endregion */

/* #region  GET /map-it-notion/map-data/{id}/bounds */

/// Updates everything in the database by fetching from Notion
router.get('/map-data/:id/bounds', async function (req, res) {
    try {
        let id = req.params['id']

        let notionMap = await NotionMapModel.findById(new mongoose.Types.ObjectId(id))
        if (!notionMap) {
            throw `Notion map not found with id ${id}`
        }

        return res.send(notionMap.mapBounds ?? null)
    } catch (error) {
        return res.send(null)
    }
})

/* #endregion */

/* #region  Helper Methods */

async function mapDataForId(id) {
    try {
        let notionMap = await NotionMapModel.findById(new mongoose.Types.ObjectId(id))
        if (!notionMap) {
            throw `Notion map not found with id ${id}`
        }
        return notionMap.buildings ?? {}
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

/* #region  Notion API (using shared service) */

async function notionFetchDataFromTable(apiKey, databaseId) {
    // Using legacy API version for backward compatibility
    const data = await notionApi.queryDatabase(apiKey, databaseId, {
        sorts: [
            {
                "property": "Last Edited",
                "direction": "descending"
            }
        ]
    }, notionApi.LEGACY_NOTION_VERSION)
    return { data }
}

function notionExtractLocations(data) {
    let mapObjects = {}
    for (let result of data.results) {
        let properties = result.properties

        let mapObject = {
            id: result.id,
            latitude: properties.Latitude.number,
            longitude: properties.Longitude.number,
            lastEdited: new Date(result.last_edited_time),
            synced: properties.Synced.checkbox
        }

        if (properties.Name.title != null && properties.Name.title.length > 0) {
            mapObject.title = properties.Name.title.map(x => x.plain_text).join('')
            mapObject.info = mapObject.title
        }

        if (properties.Yelp != null && properties.Yelp.url != null && properties.Yelp.url.length > 0) {
            try {
                let url = new URL(properties.Yelp.url)
                let path = url.pathname
                let pathSplit = path.split('/')
                let id = pathSplit[pathSplit.length - 1]
                mapObject.yelp = url
                mapObject.yelpId = id
            } catch (error) {
                // Invalid URL
                console.log(`Invalid Yelp url: ${error}`)
            }
        } else if (properties["Google Maps"] != null && properties["Google Maps"].url != null && properties["Google Maps"].url.length > 0) {
            try {
                let url = new URL(properties["Google Maps"].url)
                mapObject.googleMap = url.pathname
            } catch (error) {
                // Invalid URL
                console.log(`Invalid Google Maps url: ${error}`)
            }
        }

        mapObjects[result.id] = mapObject
    }
    return mapObjects
}

async function notionUpdateWithLocation(apiKey, location) {
    let properties = {}

    if (location.latitude != null) {
        properties.Latitude = { "number": location.latitude }
    }
    if (location.longitude != null) {
        properties.Longitude = { "number": location.longitude }
    }

    if (location.name != null) {
        properties.Name = {
            title: [
                {
                    type: "text",
                    text: {
                        content: location.name
                    }
                }
            ]
        }
    }

    if (location.city != null) {
        properties.City = {
            select: {
                name: location.city
            }
        }
    }

    if (location.price != null) {
        properties.Price = {
            select: {
                name: location.price
            }
        }
    }

    if (location.categories != null) {
        let categories = location.categories.map(x => {
            return {
                name: x.replaceAll(",", " ")    // Notion does not allow commas
            }
        })

        properties.Tags = {
            multi_select: categories
        }
    }

    properties.Synced = {
        checkbox: true
    }

    // Using legacy API version for backward compatibility
    const data = await notionApi.updatePage(apiKey, location.id, properties, null, notionApi.LEGACY_NOTION_VERSION)
    return { data }
}

/* #endregion */

/* #region  Yelp API */

async function getInfoFromYelpIfNeeded(locations) {
    for (let [key, location] of Object.entries(locations)) {
        // Skip: No yelp info
        if (location.yelpId == null || location.yelpId.length == 0) {
            continue
        }

        let yelpRawResponse = await yelpFetchBusinessFromId(location.yelpId)
        let yelpObject = yelpExtractDataForMap(yelpRawResponse.data)
        yelpMapYelpDataIntoLocation(yelpObject, location)
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
        name: data.name,
        price: data.price
    }

    if (data.location != null) {
        yelpObject.city = data.location.city
    }

    if (data.coordinates != null) {
        yelpObject.latitude = data.coordinates.latitude
        yelpObject.longitude = data.coordinates.longitude
    }

    if (data.categories != null) {
        yelpObject.categories = data.categories.map(x => x.title)
    }

    return yelpObject
}

function yelpMapYelpDataIntoLocation(yelpObject, location) {
    location.name = yelpObject.name
    location.title = location.name
    location.info = location.name
    location.city = yelpObject.city
    location.latitude = yelpObject.latitude
    location.longitude = yelpObject.longitude
    location.categories = yelpObject.categories
    location.price = yelpObject.price
}

/* #endregion */

/* #region  Google Maps API */

async function getInfoFromGoogleMapIfNeeded(locations) {
    for (let [key, location] of Object.entries(locations)) {
        // Skip: Yelp is used
        if (location.yelpId != null && location.yelpId.length > 0) {
            continue
        }

        // Skip: Google Map URL is missing
        if (location.googleMap == null || location.googleMap.length == 0) {
            continue
        }
        
        let googleMap = await googleApiService.getPlaceDetailFor(location.googleMap)
        googleMapDataIntoLocation(googleMap, location)
    }
}

function googleMapDataIntoLocation(googleMap, location) {
    if (googleMap == null) { return }

    if (googleMap.displayName != null) {
        location.name = googleMap.displayName.text
        location.title = googleMap.displayName.text
        location.info = googleMap.displayName.text
    }
    
    if (googleMap.location != null) {
        location.latitude = googleMap.location.latitude
        location.longitude = googleMap.location.longitude    
    }
    
    location.price = googleMapPriceLevelMap(googleMap.priceLevel)

    const cityComponent = googleMap.addressComponents.filter(x => x.types.includes('locality'))
    if (cityComponent != null && cityComponent.length > 0 ) {
        location.city = cityComponent[0].longText
    }
    
    // location.categories = yelpObject.categories // Not supported by Google Places
}

function googleMapPriceLevelMap(priceDescription) {
    switch (priceDescription) {
        case 'PRICE_LEVEL_INEXPENSIVE':
            return '$';
        case 'PRICE_LEVEL_MODERATE':
            return '$$';
        case 'PRICE_LEVEL_EXPENSIVE':
            return '$$$';
        case 'PRICE_LEVEL_VERY_EXPENSIVE':
            return '$$$$';
        default:
            return null;
    }
}

/* #endregion */

module.exports = router