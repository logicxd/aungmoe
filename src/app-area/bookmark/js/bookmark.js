
$(document).ready(function () {
    $('.modal').modal();
});

/* #region  Button Listners */

$('#bookmark-check-updates-button').click(() => {
    $('#bookmark-check-updates-button').addClass('disabled')
    $('#bookmark-check-updates-button').html('Checking Updates <i class="fas fa-circle-notch fa-spin"></i>')
    $.ajax({
        method: 'PATCH',
        url: 'bookmark/check-updates',
        success: function (res) {
            let numOfBookmarksUpdated = parseInt(res)
            if (numOfBookmarksUpdated > 0) {
                M.toast({
                    html: `${numOfBookmarksUpdated} bookmarks updated!`,
                    classes: 'green lighten-1',
                    displayLength: 2000,
                    completeCallback: () => {
                        location.reload()
                    }
                })
            } else {
                M.toast({
                    html: `No new updates 😭`,
                    classes: 'green lighten-1',
                    displayLength: 2000
                })
                $('#bookmark-check-updates-button').removeClass('disabled')
            }
        },
        error: function (error) {
            console.error(error.responseText)
            M.toast({ html: error.responseText, classes: 'red lighten-1' })
            $('#bookmark-check-updates-button').removeClass('disabled')
        }
    }).always(() => {
        $('#bookmark-check-updates-button').html('Check Updates')
    })
})

// Button that opens the modal
$('#bookmark-add-button').click(() => {
    var element = document.getElementById("bookmark-modal-add");
    M.Modal.getInstance(element).open();
})

// Button ON the modal that adds the content
$('#bookmark-modal-add-button').click(() => {
    let contentType = ''
    if ($('#bookmark-modal-add-radio-webtoon').is(':checked')) {
        contentType = 'webtoon'
    } else if ($('#bookmark-modal-add-radio-novel').is(':checked')) {
        contentType = 'novel'
    }

    // Display loading screen 
    $('#bookmark-modal-add-button').addClass('disabled')
    $('#bookmark-loading-screen').css('display', 'flex')
    $.ajax({
        method: 'POST',
        url: 'bookmark',
        data: {
            'title': $('#bookmark-modal-add-title').val(),
            'imageUrl': $('#bookmark-modal-add-image').val(),
            'url': $('#bookmark-modal-add-url').val(),
            'type': contentType
        },
        success: function (res) {
            M.toast({
                html: "Added bookmark!",
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
            $('#bookmark-modal-add-button').removeClass('disabled')
        }
    }).always(() => {
        $('#bookmark-loading-screen').css('display', 'none')
    })
})

$('#bookmark-modal-add-title').keyup(() => {
    checkIfFormIsReadyToSubmit()
})

$('#bookmark-modal-add-image').keyup(() => {
    checkIfFormIsReadyToSubmit()
})

$('#bookmark-modal-add-url').keyup(() => {
    checkIfFormIsReadyToSubmit()
})

/* #endregion */

/* #region  Helper Methods */
function checkIfFormIsReadyToSubmit() {
    if (hasValidInputs()) {
        $('#bookmark-modal-add-button').removeClass('disabled')
    } else {
        $('#bookmark-modal-add-button').addClass('disabled')
    }
}

function hasValidInputs() {
    // Check that inputs have some text in them
    if (!$('#bookmark-modal-add-title').val()) {
        return false
    }
    if (!$('#bookmark-modal-add-image').val()) {
        return false
    }
    if (!$('#bookmark-modal-add-url').val()) {
        return false
    }

    // Check that URLs are valid
    let validUrl = isValidHttpUrl($('#bookmark-modal-add-image').val())
    validUrl = validUrl && isValidHttpUrl($('#bookmark-modal-add-url').val())

    return validUrl
}

function isValidHttpUrl(string) {
    let url;
    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
}
/* #endregion */