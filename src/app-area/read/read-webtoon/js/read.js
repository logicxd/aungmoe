"use strict";

$(document).ready(function () {
    $('.modal').modal();
    $('.fixed-action-btn').floatingActionButton({
        hoverEnabled: false
    });
    $('.tooltipped').tooltip();
});

function initializeConfigValues() {
    $('#config-webtoon-tap-to-scroll').prop('checked', isTapToScrollEnabled())
}

/* #region  Button action handlers */
$('.tap-to-scroll').click(() => {
    var isEnabled = isTapToScrollEnabled()
    if (isEnabled) {
        pageDown()
    }
})

$('#apply').click(() => {
    var settings = saveSettings();
    if (settings.urlChanged) {
        changePage(settings.url)
    }
});

$('#floating-settings-button').click(() => {
    initializeConfigValues();
    var element = document.getElementById("settings-modal")
    M.Modal.getInstance(element).open()
})

function nextPageClicked(url) {
    setConfigWebtoonUrl(url)
    changePage(url);
}
/* #endregion */

function pageDown() {
    var scrollByAmount = document.documentElement.clientHeight * 0.90;
    $('html, body').animate({
        scrollTop: `+=${scrollByAmount}`
    }, 200);
}