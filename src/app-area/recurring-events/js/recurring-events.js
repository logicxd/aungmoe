
$(document).ready(function () {
    $('.modal').modal();
});

/* #region  "Add" button */
// Button that opens the modal
$('#recurring-events-add-button').click(() => {
    clearInfoModal()
    $('#recurring-events-info-modal-button').html('Add')
    var element = document.getElementById("recurring-events-info-modal");
    M.Modal.getInstance(element).open();
})
/* #endregion */


/* #region  Info modal */
// Button ON the modal that adds the content
$('#recurring-events-info-modal-button').click(() => {
    let action = $('#recurring-events-info-modal-button').text()
    if (action === 'Add') {
        addRecurringEventsConfig()
    }
})

function addRecurringEventsConfig() {
    let data = {
        'title': $('#recurring-events-info-modal-title').val(),
        'databaseId': $('#recurring-events-info-modal-databaseId').val(),
        'secretKey': $('#recurring-events-info-modal-secretKey').val()
    }

    displayLoadingScreen()
    $('#recurring-events-info-modal-button').addClass('disabled')

    $.ajax({
        method: 'POST',
        url: 'recurring-events',
        data: data,
        success: function (res) {
            M.toast({
                html: 'Added Recurring Events Configuration!',
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
            $('#recurring-events-info-modal-button').removeClass('disabled')
        }
    }).always(() => {
        removeLoadingScreen()
    })
}

$('#recurring-events-info-modal-title').keyup(() => {
    checkIfFormIsReadyToSubmit()
})

$('#recurring-events-info-modal-databaseId').keyup(() => {
    checkIfFormIsReadyToSubmit()
})

$('#recurring-events-info-modal-secretKey').keyup(() => {
    checkIfFormIsReadyToSubmit()
})

function clearInfoModal() {
    $('#recurring-events-info-modal-id').val("")
    $('#recurring-events-info-modal-title').val("")
    $('#recurring-events-info-modal-databaseId').val("")
    $('#recurring-events-info-modal-secretKey').val("")
}
/* #endregion */

/* #region  Helper Methods */
function displayLoadingScreen() {
    $('#loading-screen').css('display', 'flex')
}

function removeLoadingScreen() {
    $('#loading-screen').css('display', 'none')
}

function checkIfFormIsReadyToSubmit() {
    if (hasValidInputs()) {
        $('#recurring-events-info-modal-button').removeClass('disabled')
    } else {
        $('#recurring-events-info-modal-button').addClass('disabled')
    }
}

function hasValidInputs() {
    // Check that inputs have some text in them
    if (!$('#recurring-events-info-modal-title').val()) {
        return false
    }
    if (!$('#recurring-events-info-modal-databaseId').val()) {
        return false
    }
    if (!$('#recurring-events-info-modal-secretKey').val()) {
        return false
    }
    return true
}

/* #endregion */
