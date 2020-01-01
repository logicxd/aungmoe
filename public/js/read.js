var global = {
    currentParagraph: 0,
    isAutoScrolling: false
};

$(document).ready(function () {
    updateDefaultValues();
    initializeValuesOnLoad();
    $('.modal').modal();
    $('.fixed-action-btn').floatingActionButton({
        hoverEnabled: false
    });
});
 
function initializeValuesOnLoad() {
    global.currentParagraph = 0;
    global.isAutoScrolling = getCookie('autoscroll') === 'true';
    autoscrollIfEnabled();
}

/// Button events

$('#submit').click(() => {
    var settings = saveSettings();
    changePage(settings.url);
});

$('#apply').click(() => {
    var settings = saveSettings();
    if (settings.urlChanged) {
        changePage(settings.url);
    }
    autoscrollIfEnabled();
});

$('.tap-to-scroll').click(() => {
    global.isAutoScrolling = false;
    pageDown();
});

$('#floating-settings-button').click(() => {
    global.isAutoScrolling = false;
});

$('#autoscroll').click(() => {
    updateStateOfValues();
});

function nextPageClicked(url) {
    setCookie('currentPageLink', url);
    changePage(url);
}

function openModal() {
    updateDefaultValues();
    var element = document.getElementById("settings-modal");
    M.Modal.getInstance(element).open();
}

function autoscrollButtonClicked() {
    global.isAutoScrolling = !global.isAutoScrolling;
    autoscrollIfEnabled();
}

/// Helper

function saveSettings() {
    var currentUrl = getCookie('currentPageLink');
    var settings = {
        url: $('#url').val(),
        autoloadNext: $('#autoload-next').is(':checked'),
        autoscroll: $('#autoscroll').is(':checked'),
        wordsPerMinute: $('#words-per-minute').val()
    };
    settings.urlChanged = currentUrl !== settings.url;
    settings.wordsPerMinute = settings.wordsPerMinute <= 0 ? 250 : settings.wordsPerMinute;

    setCookie('currentPageLink', settings.url);
    setCookie('autoloadNext', settings.autoloadNext);
    setCookie('autoscroll', settings.autoscroll);
    setCookie('wordsPerMinute', settings.wordsPerMinute);

    global.isAutoScrolling = settings.autoscroll;

    return settings;
}

function updateDefaultValues() {
    $('#autoload-next').prop('checked', getCookie('autoloadNext'));
    $('#autoscroll').prop('checked', getCookie('autoscroll'));
    $('#words-per-minute').val(getCookie('wordsPerMinute'));
    updateStateOfValues();
}

function updateStateOfValues() {
    var autoscrollChecked = $('#autoscroll').is(':checked');
    $('#autoload-next').prop('disabled', !autoscrollChecked);
    $('#words-per-minute').prop('disabled', !autoscrollChecked);
}

function pageDown() {
    var clientHeight = document.documentElement.clientHeight;
    var scrollByAmount = clientHeight * 0.90;
    $('html, body').animate({
        scrollTop: `+=${scrollByAmount}`
     }, 400);
}

function changePage(url) {
    window.location.href = `?url=${url}`;
}

function canAutoScroll() {
    return getCookie('autoscroll') === 'true' && global.isAutoScrolling;
}

function autoscrollIfEnabled() {
    if (!canAutoScroll()) {
        return;
    }

    var element = document.getElementById(`text-paragraph-${global.currentParagraph++}`);
    if (element) {
        element.scrollIntoView({behavior: "smooth", block: "center"});
        
        var wpm = getCookie('wordsPerMinute');
        var numberOfWords = element.textContent.split(' ').length;
        var timeout = numberOfWords / (wpm / 60.0 / 1000.0);
        setTimeout(function() {
            autoscrollIfEnabled();
        }, timeout);
    } else {
        if (getCookie('autoloadNext') === 'true') {
            $('#nextpage-preloader').show();
            setTimeout(function() {
                $('#next-page-button').click();
            }, 3000);
        }
    }
}