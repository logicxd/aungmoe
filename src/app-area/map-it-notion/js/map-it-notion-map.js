
function renderMap() {
    const mapEl = $('#notion-map-google-map-render').get(0);

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

    fetchMapData(mapObjects => {
        // Display a map on the page
        const map = new google.maps.Map(mapEl, { mapTypeId: 'roadmap' });
        placeMarkerOnMap(mapObjects, map);
    })
}

function placeMarkerOnMap(buildings, map) {
    // Loop through our array of buildings & place each one on the map  
    const bounds = new google.maps.LatLngBounds();
    buildings.forEach((building) => {
        const position = { lat: building.latitude, lng: building.longitude }
        // Stretch our bounds to the newly found marker position
        bounds.extend(position);

        const marker = new google.maps.Marker({
            position: position,
            map: map,
            title: building.title
        });

        const infoWindow = new google.maps.InfoWindow();
        // Allow each marker to have an info window
        google.maps.event.addListener(marker, 'click', () => {
            infoWindow.setContent(building.info);
            infoWindow.open(map, marker);
        })

        // Automatically center the map fitting all markers on the screen
        map.fitBounds(bounds);
    })
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