
$(document).ready(function () {
    $('.modal').modal();
});

/* #region  Button Listners */

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

    // TODO: sanitize data (do this in backend)
    console.log('Add content')
    $('#bookmark-loading-screen').css('display', 'flex')
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