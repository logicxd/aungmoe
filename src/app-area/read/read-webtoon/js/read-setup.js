$(document).ready(function () {
    initializeConfigValues();
});

function initializeConfigValues() {
    $('#config-webtoon-tap-to-scroll').prop('checked', localStorage.getItem('config-webtoon-tap-to-scroll') === 'true')
}

/* #region  Button events */
$('#submit').click(() => {
    var settings = saveSettings();
    changePage(settings.url);
});
/* #endregion */

/* #region  Save Configurations */
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
/* #endregion */

/* #region  Helper Functions */
function changePage(url) {
    window.location.href = `?url=${url}`;
}
/* #endregion */