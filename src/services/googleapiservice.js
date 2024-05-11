"use strict";

/* #region  Imports */
var axios = require('axios')
let googleAccessKey = process.env.GOOGLE_API
// const Fuse = require('fuse.js') // Could potentially use to filter and find our location
/* #endregion */

/* #region  Google Maps */
async function getPlaceDetailFor(googleMapsUrl) {
    if (googleMapsUrl == null || googleMapsUrl.length == 0) {
        return null
    }

    const possiblePlaces = await placeTextSearch(googleMapsUrl)
    return possiblePlaces.length > 0 ? possiblePlaces[0] : null
}

async function placeTextSearch(googleMapsUrl) {
    const placeName = extractRestaurantNameFromUrl(googleMapsUrl)
    const location = extractLocationFromUrl(googleMapsUrl)

    if (placeName == null || location == null) {
        return []
    }
    
    const options = {
        method: 'POST',
        url: `https://places.googleapis.com/v1/places:searchText`,
        headers: {
            'Accept': 'application/json',
            'X-Goog-Api-Key': googleAccessKey,
            'X-Goog-FieldMask': 'places.displayName,places.priceLevel,places.id,places.location,places.addressComponents'
        },
        data: {
            "textQuery": decodeURIComponent(placeName),
            "maxResultCount": 4,
            "rankPreference": "DISTANCE",
            "locationBias": {
                "circle": {
                    "center": {
                        "latitude": location[0],
                        "longitude": location[1]
                    },
                    "radius": 400.0
                }
            }
        }
    }

    let res = await axios(options)
    if (res.status != 200 || 
        res.data == null ||
        res.data.places == null
    ) {
        return []
    }
    return res.data.places
}

function extractRestaurantNameFromUrl(googleMapsUrl) {
    // Example URL
    // From "/maps/place/<PLACE NAME>/@37.645138,-122.45232,16z/data=<OBFUSCATED>"
    // We want the "<PLACE NAME>"
    try {
        const name = googleMapsUrl.split('/place/')[1].split('/@')[0]
        return name
    } catch (error) {
        console.log(`Failed to grab name from Google Maps url: ${error}`)
    }
    return null
}

function extractLocationFromUrl(googleMapsUrl) {
    // Example URL
    // From "/maps/place/<PLACE NAME>/@37.645138,-122.45232,16z/data=<OBFUSCATED>"
    // We want the "37.645138,-122.45232"
    try {
        const coordinates = googleMapsUrl.split('/@')[1].split(',').slice(0, 2)
        return coordinates.length != 2 ? null : coordinates
    } catch (error) {
        console.log(`Failed to grab name from Google Maps url: ${error}`)
    }
    return null
}

/* #endregion */

module.exports = {
    getPlaceDetailFor
}