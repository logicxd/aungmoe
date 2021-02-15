$('.tap-to-scroll').click(() => {
    var isEnabled = localStorage.getItem('config-webtoon-tap-to-scroll') === 'true'
    if (isEnabled) {
        pageDown()
    }
})

$(document).ready(function () {
    $('.modal').modal();
    $('.fixed-action-btn').floatingActionButton({
        hoverEnabled: false
    });
    $('.tooltipped').tooltip();
});

function pageDown() {
    var scrollByAmount = document.documentElement.clientHeight * 0.90;
    $('html, body').animate({
        scrollTop: `+=${scrollByAmount}`
    }, 200);
}

function nextPageClicked(url) {
    localStorage.setItem('config-webtoon-url', url);
    changePage(url);
}

function saveSettings() {
    var settings = {
        url: $('#config-webtoon-url').val(),
        tapToScroll: $('#config-webtoon-tap-to-scroll').is(':checked'),
    }
    var currentUrl = localStorage.getItem('config-webtoon-url');
    settings.urlChanged = currentUrl !== settings.url;
    localStorage.setItem('config-webtoon-url', settings.url);
    localStorage.setItem('config-webtoon-tap-to-scroll', settings.tapToScroll);
    return settings;
}

function changePage(url) {
    window.location.href = `?url=${url}`;
}

/* #region  Settings Modal */
$('#apply').click(() => {
    var settings = saveSettings();
    if (settings.urlChanged) {
        changePage(settings.url)
    }
});

function openModal() {
    initializeConfigValues();
    var element = document.getElementById("settings-modal")
    M.Modal.getInstance(element).open()
}

function initializeConfigValues() {
    $('#config-webtoon-tap-to-scroll').prop('checked', localStorage.getItem('config-webtoon-tap-to-scroll') === 'true')
}
/* #endregion */