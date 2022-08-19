async function renderMap() {
    let locations = await fetchMapData()
    let bounds = await getMapBounds()
    placeMarkerOnMapWithLocations(locations, bounds)
}

// Display a map on the page
function placeMarkerOnMapWithLocations(locations, bounds) {
    const mapEl = $('#notion-map-google-map-render').get(0);
    const map = new google.maps.Map(mapEl, { mapTypeId: 'roadmap' });
    placeMarkerOnMap(locations, map, bounds);

    google.maps.event.addListener(map, 'idle', function(event) {
        console.log(`  Map Bonds: ${JSON.stringify(this.getBounds().toJSON())}`)
        console.log(`  Zoom: ${this.getZoom()}`)
        updateMapBounds(this.getBounds().toJSON())
    });
}

function placeMarkerOnMap(locations, map, bounds) {
    // Loop through our array of buildings & place each one on the map  
    const localBounds = new google.maps.LatLngBounds();
    for (let location of locations) {
        if (location.latitude == null || location.longitude == null) {
            continue
        }

        const position = { lat: location.latitude, lng: location.longitude }
        // Stretch our bounds to the newly found marker position
        localBounds.extend(position);

        const marker = new google.maps.Marker({
            position: position,
            map: map,
            title: location.title
        });

        const infoWindow = new google.maps.InfoWindow();
        // Allow each marker to have an info window
        google.maps.event.addListener(marker, 'click', () => {
            infoWindow.setContent(location.info);
            infoWindow.open(map, marker);
        })
    }

    // Automatically center the map fitting all markers on the screen
    if (bounds != null) {
        map.fitBounds(bounds, 0)
    } else {
        map.fitBounds(localBounds)
    }
}

async function fetchMapData(completion) {
    let mapId = $('#notion-map-id').val()
    const options = {
        method: 'GET',
        url: `/map-it-notion/map-data/${mapId}`
    }

    let res = await axios(options)
    if (res.status == 200) {
        return res.data
    } else { 
        console.error(`Error fetching map data ${res.statusText}`)
        return []
    }
}

/* #region   Refresh button click*/

$('#notion-map-render-refresh-button').click(() => {
    $('#notion-map-render-refresh-button').addClass('disabled')
    $('#notion-map-render-refresh-button').html('Checking Updates <i class="fas fa-circle-notch fa-spin"></i>')
    let mapId = $('#notion-map-id').val()
    $.ajax({
        method: 'PUT',
        url: `/map-it-notion/map-data/${mapId}/refresh?forceUpdate=false`,
        success: function (res) {
            if (res === null) { return }

            // M.toast({
            //     html: `Updated Locations`,
            //     classes: 'green lighten-1',
            //     displayLength: 3000,
            //     completeCallback: () => {
            //         location.reload()
            //     }
            // })

            // let numOfBookmarksUpdated = parseInt(res)
            // if (numOfBookmarksUpdated > 0) {
            //     M.toast({
            //         html: `${numOfBookmarksUpdated} bookmarks updated!`,
            //         classes: 'green lighten-1',
            //         displayLength: 4000,
            //         completeCallback: () => {
            //             location.reload()
            //         }
            //     })
            // } else {
            //     M.toast({
            //         html: `No new updates 😭`,
            //         classes: 'green lighten-1',
            //         displayLength: 4000
            //     })
            //     $('#notion-map-render-refresh-button').removeClass('disabled')
            // }
        },
        error: function (error) {
            console.error(error.responseText)
            M.toast({ html: error.responseText, classes: 'red lighten-1' })
            $('#notion-map-render-refresh-button').removeClass('disabled')
        }
    }).always(() => {
        location.reload()
    })
})
/* #endregion */

/* #region   Update Map Bounds*/

async function updateMapBounds(bounds) { 
    let mapId = $('#notion-map-id').val()
    const options = {
        method: 'PUT',
        url: `/map-it-notion/map-data/${mapId}/bounds`,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        data: bounds
    }

    let res = await axios(options)
    if (res.status == 200) {
        console.log("Updated map bounds")
    } else { 
        console.error(`Error updating map bounds ${res.statusText}`)
    }
}
/* #endregion */

/* #region   Get Map Bounds*/

async function getMapBounds(bounds) { 
    let mapId = $('#notion-map-id').val()
    const options = {
        method: 'GET',
        url: `/map-it-notion/map-data/${mapId}/bounds`,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }

    let res = await axios(options)
    if (res.status == 200) {
        return res.data
    } else { 
        console.error(`Error fetching map bounds ${res.statusText}`)
        return null
    }
}
/* #endregion */