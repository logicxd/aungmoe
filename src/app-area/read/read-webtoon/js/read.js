"use strict";

/* #region  Initialize */
var global = {
    isAutoScrolling: false,
    windowHeight: document.documentElement.clientHeight,
    timer: null
}

$(document).ready(function () {
    initializeValuesOnLoad()
    $('.modal').modal();
    $('.fixed-action-btn').floatingActionButton({
        hoverEnabled: false
    });
    $('.tooltipped').tooltip();
    enableKeydownEvents()
});

function initializeValuesOnLoad() {
    global.isAutoScrolling = false;
    global.windowHeight = document.documentElement.clientHeight;
    global.noSleep = new NoSleep()
    autoscrollIfEnabled();
}
/* #endregion */

/* #region  Button action handlers */
$('.tap-to-scroll').click(() => {
    var isEnabled = isTapToScrollEnabled()
    if (isEnabled) {
        pageDown()
        autoscrollIfEnabled() // Resets scroll timer
    }
})

$('#apply').click(() => {
    var settings = saveSettings();
    global.isAutoScrolling = settings.autoscroll
    if (settings.urlChanged) {
        changePage(settings.url)
    }
    autoscrollIfEnabled();
});

$('#floating-settings-button').click(() => {
    initializeConfigValues();
    var element = document.getElementById("settings-modal")
    M.Modal.getInstance(element).open()
})

function initializeConfigValues() {
    $('#config-webtoon-tap-to-scroll').prop('checked', isTapToScrollEnabled())
    $('#config-webtoon-autoscroll').prop('checked', isAutoscrollEnabled())
}

function nextPageClicked(url) {
    setConfigWebtoonUrl(url)
    changePage(url);
}

function pageDown() {
    var scrollByAmount = document.documentElement.clientHeight * 0.70;
    $('html, body').animate({
        scrollTop: `+=${scrollByAmount}`
    }, 200);
    if (isEndOfPage()) {
        stopAutoscroll()
    } else {
        autoscrollIfEnabled()
    }
}

function isEndOfPage() {
    let currentScroll = window.innerHeight + window.scrollY
    let totalHeight = document.body.offsetHeight
    return currentScroll + 5 >= totalHeight
}

function pageUp() {
    var scrollByAmount = document.documentElement.clientHeight * 0.70;
    $('html, body').animate({
        scrollTop: `-=${scrollByAmount}`
    }, 200);
    autoscrollIfEnabled()   // Resets scroll timer
}
/* #endregion */

/* #region  Controls Bar Buttons */
$('#controls-bar-fast-rewind').click(() => {
    $('#controls-bar-fast-rewind-icon').animateCss('shift-left', null);
    pageUp()
});

$('#controls-bar-play-pause').click(() => {
    if (global.isAutoScrolling) {
        stopAutoscroll();
    } else {
        global.isAutoScrolling = true;
        autoscrollIfEnabled();
    }
    updateStateOfControlsBarPlayPauseButton();
});

$('#controls-bar-fast-forward').click(() => {
    $('#controls-bar-fast-forward-icon').animateCss('shift-right', null);
    pageDown()
});

function updateStateOfControlsBarPlayPauseButton() {
    const icon = $('#controls-bar-play-pause-icon');
    if (global.isAutoScrolling && icon.text() !== 'pause') {
        icon.animateCss('rotateOut', () => {
            icon.text('pause');
            icon.animateCss('rotateIn', null);
        });
    } else if (!global.isAutoScrolling && icon.text() !== 'play_arrow') {
        icon.animateCss('rotateOut', () => {
            icon.text('play_arrow');
            icon.animateCss('rotateIn', null);
        });
    }
}
/* #endregion */

/* #region  Autoscroll */
function autoscrollIfEnabled() {
    const canAutoscroll = isAutoscrollEnabled()
    $('#fixed-controls-bar-container').toggleClass('hide', !canAutoscroll);
    if (canAutoscroll) {
        autoscroll();
    }
    updateStateOfControlsBarPlayPauseButton();
    if (global.isAutoScrolling && !global.noSleep.enabled) {
        global.noSleep.enable();
    }
}

function stopAutoscroll() {
    global.isAutoScrolling = false;
    clearTimeout(global.timer);
    updateStateOfControlsBarPlayPauseButton();
    global.noSleep.disable();
}

function autoscroll() {
    if (!global.isAutoScrolling) { return }

    let timeoutOffset = 7   // Seconds
    let rate = autoscrollRate() // Value is from 1-7 inclusively on both ends. 1 is slowest, 7 is fastest.
    let timeout = timeoutOffset - rate // Slowest, scrolls every 7 seconds. Fastest, scrolls every 1 second.
    timeout *= 1000
    clearTimeout(global.timer)
    global.timer = setTimeout(() => {
        if (!global.isAutoScrolling) { return }
        pageDown()
    }, timeout)
}

/* #endregion */