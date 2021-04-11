
$(document).ready(function () {
    $('.modal').modal();
});

/* #region  Button Handlers */

// Button that opens the modal
$('#bookmark-add-button').click(() => {
    var element = document.getElementById("bookmark-modal-add");
    M.Modal.getInstance(element).open();
})

// Button ON the modal that adds the content
$('#bookmark-modal-add-button').click(() => {
    // TODO: validate data and input
    // TODO: sanitize data
    console.log('Add content')
    $('#bookmark-loading-screen').css('display', 'flex')
})

/* #endregion */