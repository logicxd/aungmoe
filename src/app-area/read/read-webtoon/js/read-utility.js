"use strict";

/* #region  Configurations and LocalStorage */
function saveSettings() {
    var settings = {
        url: $('#config-webtoon-url').val(),
        tapToScroll: $('#config-webtoon-tap-to-scroll').is(':checked'),
        autoscroll: $('#config-webtoon-autoscroll').is(':checked'),
        autoscrollRate: $('#config-webtoon-autoscroll-rate').val()
    }
    var currentUrl = localStorage.getItem('config-webtoon-url')
    settings.urlChanged = currentUrl !== settings.url
    localStorage.setItem('config-webtoon-url', settings.url)
    localStorage.setItem('config-webtoon-tap-to-scroll', settings.tapToScroll)
    localStorage.setItem('config-webtoon-autoscroll', settings.autoscroll)
    localStorage.setItem('config-webtoon-autoscroll-rate', settings.autoscrollRate)
    return settings
}

function isTapToScrollEnabled() {
    return localStorage.getItem('config-webtoon-tap-to-scroll') === 'true'
}

function isAutoscrollEnabled() {
    return localStorage.getItem('config-webtoon-autoscroll') === 'true'
}

function autoscrollRate() {
    try {
        let autoscrollRate = localStorage.getItem('config-webtoon-autoscroll-rate')
        return parseInt(autoscrollRate)
    } catch (error) {
        console.error("Invalid autoscroll rate. Returning a default value")
        return 3
    }
}

function setConfigWebtoonUrl(url) {
    localStorage.setItem('config-webtoon-url', url);
}
/* #endregion */

/* #region  Page Manipulation Functions */
function changePage(url) {
    let href = `?url=${url}`
    const bookmarkId = $('#read-bookmark-id').val()
    if (bookmarkId) {
        href += `&bookmark=${bookmarkId}`
    }
    window.location.href = href;
}

function enableKeydownEvents() {
    $(document).bind("keydown", function (e) {
        var key = e.originalEvent.code
        switch (key) {
            case 'ArrowRight':
                const nextPageUrl = $('#next-page-url').val()
                if (nextPageUrl) {
                    nextPageClicked(nextPageUrl)
                }
                break
            case 'ArrowLeft':
                history.back()
                break
            default:
                // No-op
                break
        }
    })
}
/* #endregion */