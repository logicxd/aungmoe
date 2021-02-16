$(document).ready(function () {
    initializeConfigValues();
});

function initializeConfigValues() {
    $('#config-webtoon-tap-to-scroll').prop('checked', isTapToScrollEnabled())
}

/* #region  Button events */
$('#submit').click(() => {
    var settings = saveSettings();
    changePage(settings.url);
});
/* #endregion */