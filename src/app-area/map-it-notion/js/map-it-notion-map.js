
function renderMap() {
    //  // Display a map on the page
    //  const map = new google.maps.Map(mapEl, { mapTypeId: 'roadmap' });

    //  const buildings = [
    //      {
    //          title: 'London Eye, London',
    //          latitude: 51.503454,
    //          longitude: -0.119562,
    //          info: 'carousel'
    //      },
    //      {
    //          title: 'Palace of Westminster, London',
    //          latitude: 51.499633,
    //          longitude: -0.124755,
    //          info: 'palace'
    //      }
    //  ];

    //  placeMarkerOnMap(buildings, map);

    fetchMapData(locations => {
        placeMarkerOnMapWithLocations(locations)
    })
}

// Display a map on the page
function placeMarkerOnMapWithLocations(locations) {
    const mapEl = $('#notion-map-google-map-render').get(0);
    const map = new google.maps.Map(mapEl, { mapTypeId: 'roadmap' });
    placeMarkerOnMap(locations, map);
}

function placeMarkerOnMap(locations, map) {
    // Loop through our array of buildings & place each one on the map  
    const bounds = new google.maps.LatLngBounds();
    for (let location of locations) {
        if (location.latitude == null || location.longitude == null) {
            continue
        }

        const position = { lat: location.latitude, lng: location.longitude }
        // Stretch our bounds to the newly found marker position
        bounds.extend(position);

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
    map.fitBounds(bounds);
}

function fetchMapData(completion) {
    let mapId = $('#notion-map-id').val();
    $.ajax({
        method: 'GET',
        url: `/map-it-notion/map-data/${mapId}`,
        success: function (res) {
            completion(res)
        },
        error: function (error) {
            console.error(error.responseText)
        }
    })
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