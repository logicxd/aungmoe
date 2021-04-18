
$(document).ready(function () {
    $('.modal').modal();
});

/* #region  "Check Updates" button */
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
                    displayLength: 4000,
                    completeCallback: () => {
                        location.reload()
                    }
                })
            } else {
                M.toast({
                    html: `No new updates 😭`,
                    classes: 'green lighten-1',
                    displayLength: 4000
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
/* #endregion */

/* #region  "Add" button */
// Button that opens the modal
$('#bookmark-add-button').click(() => {
    var element = document.getElementById("bookmark-info-modal");
    M.Modal.getInstance(element).open();
})
/* #endregion */

/* #region  "Edit"-able elements click listener*/
$('.bookmark-edit-element').click(element => {
    console.log(element)

    // var element = document.getElementById("bookmark-info-modal");
    // M.Modal.getInstance(element).open();
})
/* #endregion */

/* #region  Modal related buttons */
// Button ON the modal that adds the content
$('#bookmark-info-modal-button').click(() => {
    let contentType = ''
    if ($('#bookmark-info-modal-radio-webtoon').is(':checked')) {
        contentType = 'webtoon'
    } else if ($('#bookmark-info-modal-radio-novel').is(':checked')) {
        contentType = 'novel'
    }

    // Display loading screen 
    $('#bookmark-info-modal-button').addClass('disabled')
    $('#bookmark-loading-screen').css('display', 'flex')
    $.ajax({
        method: 'POST',
        url: 'bookmark',
        data: {
            'title': $('#bookmark-info-modal-title').val(),
            'imageUrl': $('#bookmark-info-modal-image').val(),
            'url': $('#bookmark-info-modal-url').val(),
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
            $('#bookmark-info-modal-button').removeClass('disabled')
        }
    }).always(() => {
        $('#bookmark-loading-screen').css('display', 'none')
    })
})

$('#bookmark-info-modal-title').keyup(() => {
    checkIfFormIsReadyToSubmit()
})

$('#bookmark-info-modal-image').keyup(() => {
    checkIfFormIsReadyToSubmit()
})

$('#bookmark-info-modal-url').keyup(() => {
    checkIfFormIsReadyToSubmit()
})
/* #endregion */

/* #region  Helper Methods */
function checkIfFormIsReadyToSubmit() {
    if (hasValidInputs()) {
        $('#bookmark-info-modal-button').removeClass('disabled')
    } else {
        $('#bookmark-info-modal-button').addClass('disabled')
    }
}

function hasValidInputs() {
    // Check that inputs have some text in them
    if (!$('#bookmark-info-modal-title').val()) {
        return false
    }
    if (!$('#bookmark-info-modal-image').val()) {
        return false
    }
    if (!$('#bookmark-info-modal-url').val()) {
        return false
    }

    // Check that URLs are valid
    let validUrl = isValidHttpUrl($('#bookmark-info-modal-image').val())
    validUrl = validUrl && isValidHttpUrl($('#bookmark-info-modal-url').val())

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