
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
    clearInfoModal()
    $('#bookmark-info-modal-button').html('Add')
    var element = document.getElementById("bookmark-info-modal");
    M.Modal.getInstance(element).open();
})
/* #endregion */

/* #region  "Edit"-able elements click listener*/
$('.bookmark-edit-element').click(element => {
    let bookmark = $(element.target).closest(".bookmark")
    setValuesForInfoModal(bookmark)
    $('#bookmark-info-modal-button').html('Update')
    var element = document.getElementById("bookmark-info-modal");
    M.Modal.getInstance(element).open();
})
/* #endregion */

/* #region  Info modal */
// Button ON the modal that adds the content
$('#bookmark-info-modal-button').click(() => {
    let action = $('#bookmark-info-modal-button').text()
    if (action === 'Add') {
        addBookmark()
    } else if (action === 'Update') {
        updateBookmark()
    }
})

function addBookmark() {
    let data = {
        'title': $('#bookmark-info-modal-title').val(),
        'imageUrl': $('#bookmark-info-modal-image').val(),
        'url': $('#bookmark-info-modal-url').val(),
        'type': getContentType()
    }
    createOrUpdateBookmark('POST', data)
}

function updateBookmark() {
    let data = {
        'bookmarkId': $('#bookmark-info-modal-id').val(),
        'title': $('#bookmark-info-modal-title').val(),
        'imageUrl': $('#bookmark-info-modal-image').val(),
        'url': $('#bookmark-info-modal-url').val(),
        'type': getContentType()
    }
    createOrUpdateBookmark('PUT', data)
}

function createOrUpdateBookmark(method, data) {
    displayLoadingScreen()
    $('#bookmark-info-modal-button').addClass('disabled')
    
    $.ajax({
        method: method,
        url: 'bookmark',
        data: data,
        success: function (res) {
            M.toast({
                html: method === 'POST' ? 'Added bookmark!' : 'Updated bookmark!',
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
        removeLoadingScreen()
    })
}

$('#bookmark-info-modal-title').keyup(() => {
    checkIfFormIsReadyToSubmit()
})

$('#bookmark-info-modal-image').keyup(() => {
    checkIfFormIsReadyToSubmit()
})

$('#bookmark-info-modal-url').keyup(() => {
    checkIfFormIsReadyToSubmit()
})

function setValuesForInfoModal(bookmark) {
    let id = bookmark.find('.bookmark-id').val()
    let title = bookmark.find('.card-title').html()
    let image = bookmark.find('.bookmark-image').attr('src')
    let url = bookmark.find('.bookmark-url').val()
    $('#bookmark-info-modal-id').val(id)
    $('#bookmark-info-modal-title').val(title)
    $('#bookmark-info-modal-image').val(image)
    $('#bookmark-info-modal-url').val(url)

    let type = bookmark.find('.bookmark-type').val()
    if (type === 'webtoon') {
        $('#bookmark-info-modal-radio-webtoon').prop('checked', true);
    } else if (type === 'novel') {
        $('#bookmark-info-modal-radio-novel').prop('checked', true);
    }
}

function clearInfoModal() {
    $('#bookmark-info-modal-id').val("")
    $('#bookmark-info-modal-title').val("")
    $('#bookmark-info-modal-image').val("")
    $('#bookmark-info-modal-url').val("")
}
/* #endregion */

/* #region  Helper Methods */
function displayLoadingScreen() {
    $('#bookmark-loading-screen').css('display', 'flex')
}

function removeLoadingScreen() {
    $('#bookmark-loading-screen').css('display', 'none')
}

function checkIfFormIsReadyToSubmit() {
    if (hasValidInputs()) {
        $('#bookmark-info-modal-button').removeClass('disabled')
    } else {
        $('#bookmark-info-modal-button').addClass('disabled')
    }
}

function getContentType() {
    let contentType = ''
    if ($('#bookmark-info-modal-radio-webtoon').is(':checked')) {
        contentType = 'webtoon'
    } else if ($('#bookmark-info-modal-radio-novel').is(':checked')) {
        contentType = 'novel'
    }
    return contentType
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