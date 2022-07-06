
$(document).ready(function () {
    $('.modal').modal();
});

/* #region  "Add" button */
// Button that opens the modal
$('#notion-map-add-button').click(() => {
    clearInfoModal()
    $('#notion-map-info-modal-button').html('Add')
    var element = document.getElementById("notion-map-info-modal");
    M.Modal.getInstance(element).open();
})
/* #endregion */


/* #region  Info modal */
// Button ON the modal that adds the content
$('#notion-map-info-modal-button').click(() => {
    let action = $('#notion-map-info-modal-button').text()
    if (action === 'Add') {
        addNotionMap()
    }
})

function addNotionMap() {
    let data = {
        'title': $('#notion-map-info-modal-title').val(),
        'databaseId': $('#notion-map-info-modal-databaseId').val(),
        'secretKey': $('#notion-map-info-modal-secretKey').val()
    }

    displayLoadingScreen()
    $('#notion-map-info-modal-button').addClass('disabled')
    
    $.ajax({
        method: 'POST',
        url: 'map-it-notion',
        data: data,
        success: function (res) {
            M.toast({
                html: 'Added Notion Database!',
                classes: 'green lighten-1',
                displayLength: 2000,
                completeCallback: () => {
                    location.reload()
                }
            })
        },
        error: function (error) {
            console.error(error.responseText)
            M.toast({ html: error.responseText, classes: 'red lighten-1' })
            $('#notion-map-info-modal-button').removeClass('disabled')
        }
    }).always(() => {
        removeLoadingScreen()
    })
}

$('#notion-map-info-modal-title').keyup(() => {
    checkIfFormIsReadyToSubmit()
})

$('#notion-map-info-modal-secretKey').keyup(() => {
    checkIfFormIsReadyToSubmit()
})

function clearInfoModal() {
    $('#notion-map-info-modal-id').val("")
    $('#notion-map-info-modal-title').val("")
    $('#notion-map-info-modal-databaseId').val("")
    $('#notion-map-info-modal-secretKey').val("")
}
/* #endregion */

/* #region  Helper Methods */
function displayLoadingScreen() {
    $('#notion-map-loading-screen').css('display', 'flex')
}

function removeLoadingScreen() {
    $('#notion-map-loading-screen').css('display', 'none')
}

function checkIfFormIsReadyToSubmit() {
    if (hasValidInputs()) {
        $('#notion-map-info-modal-button').removeClass('disabled')
    } else {
        $('#notion-map-info-modal-button').addClass('disabled')
    }
}

function hasValidInputs() {
    // Check that inputs have some text in them
    if (!$('#notion-map-info-modal-title').val()) {
        return false
    }
    if (!$('#notion-map-info-modal-secretKey').val()) {
        return false
    }
    if (!$('#notion-map-info-modal-databaseId').val()) {
        return false
    }
    return true
}

/* #endregion */