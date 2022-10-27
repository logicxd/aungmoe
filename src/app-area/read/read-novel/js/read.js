/* #region  Initialize */
var global = {
    currentParagraph: 0,
    isAutoScrolling: false,
    windowHeight: document.documentElement.clientHeight,
    timer: null,
    ttsLanguage: null,
    utter: null
};

$(document).ready(function () {
    updateDefaultValues();
    initializeValuesOnLoad();
    $('.modal').modal();
    $('.fixed-action-btn').floatingActionButton({
        hoverEnabled: false
    });
    $('.tooltipped').tooltip()
    enableKeydownEvents()
});

function initializeValuesOnLoad() {
    global.currentParagraph = 0;
    global.isAutoScrolling = false;
    global.windowHeight = document.documentElement.clientHeight;
    global.noSleep = new NoSleep()
    autoscrollIfEnabled();
    updateStateOfControlsBarPlayPauseButton();
}
/* #endregion */

/* #region  Setup Page */

$('#submit').click(() => {
    var settings = saveSettings();
    changePage(settings.url);
});

/* #endregion */

/* #region  Settings Modal */

$('#floating-settings-button').click(() => {
    stopAutoscroll();
});

function openModal() {
    updateDefaultValues();
    var element = document.getElementById("settings-modal");
    M.Modal.getInstance(element).open();
}

$('#autoscroll-read').click(() => {
    $('#autoscroll-text-to-speech').prop('checked', false);
    updateStateOfValues();
});

$('#autoscroll-text-to-speech').click(() => {
    $('#autoscroll-read').prop('checked', false);
    updateStateOfValues();
});

$('#apply').click(() => {
    var settings = saveSettings();
    if (settings.urlChanged) {
        changePage(settings.url);
    }
    autoscrollIfEnabled();
});

/* #endregion */

/* #region  Settings Persist */

function saveSettings() {
    var currentUrl = localStorage.getItem('currentPageLink');
    var settings = {
        url: $('#url').val(),
        autoloadNext: $('#autoload-next').is(':checked'),
        autoscrollRead: $('#autoscroll-read').is(':checked'),
        wordsPerMinute: $('#words-per-minute').val(),
        autoscrollTTS: $('#autoscroll-text-to-speech').is(':checked'),
        autoscrollTTSRate: $('#text-to-speech-rate').val()
    };
    settings.urlChanged = currentUrl !== settings.url;
    settings.wordsPerMinute = settings.wordsPerMinute <= 0 ? 270 : settings.wordsPerMinute;

    localStorage.setItem('currentPageLink', settings.url);
    localStorage.setItem('autoloadNext', settings.autoloadNext);
    localStorage.setItem('autoscroll-read', settings.autoscrollRead);
    localStorage.setItem('wordsPerMinute', settings.wordsPerMinute);
    localStorage.setItem('autoscrollTTS', settings.autoscrollTTS);
    localStorage.setItem('autoscrollTTSRate', settings.autoscrollTTSRate);

    global.isAutoScrolling = settings.autoscrollRead || settings.autoscrollTTS;

    return settings;
}

function updateDefaultValues() {
    var autoloadNext = localStorage.getItem('autoloadNext') === null ? true : localStorage.getItem('autoloadNext') === 'true';
    $('#autoload-next').prop('checked', autoloadNext);
    $('#autoscroll-read').prop('checked', localStorage.getItem('autoscroll-read') === 'true');
    $('#words-per-minute').val(localStorage.getItem('wordsPerMinute'));
    $('#autoscroll-text-to-speech').prop('checked', localStorage.getItem('autoscrollTTS') === 'true');
    if (localStorage.getItem('autoscrollTTSRate')) {
        $('#text-to-speech-rate').val(localStorage.getItem('autoscrollTTSRate'));
    }
    updateStateOfValues();
}

function updateStateOfValues() {
    var autoscrollRead = $('#autoscroll-read').is(':checked');
    var autoscrollTTS = $('#autoscroll-text-to-speech').is(':checked');
    $('#words-per-minute').prop('disabled', !autoscrollRead);
    $('#text-to-speech-rate').prop('disabled', !autoscrollTTS);
    $('#autoload-next').prop('disabled', !autoscrollRead && !autoscrollTTS);
}

/* #endregion */

/* #region  Auto Scroll Button Events */

$('#controls-bar-fast-rewind').click(() => {
    $('#controls-bar-fast-rewind-icon').animateCss('shift-left', null);
    stopAutoscroll();
    changeCurrentParagraph(global.currentParagraph - 1);
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
    stopAutoscroll();
    changeCurrentParagraph(global.currentParagraph + 1);
});

$('.tap-to-scroll').click(() => {
    stopAutoscroll();
    pageDown();
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

/* #region  Auto Scroll */

function autoscrollIfEnabled() {
    const read = localStorage.getItem('autoscroll-read') === 'true';
    const tts = localStorage.getItem('autoscrollTTS') === 'true';
    $('#fixed-controls-bar-container').toggleClass('hide', !read && !tts);
    if (read) {
        autoscrollRead();
    } else if (tts) {
        autoscrollTTS();
    }
    updateStateOfControlsBarPlayPauseButton();
    if (global.isAutoScrolling && !global.noSleep.enabled) {
        global.noSleep.enable();
    }
}

function stopAutoscroll() {
    if (global.utter) {
        global.utter.onend = null;
    }
    global.isAutoScrolling = false;
    window.speechSynthesis.cancel();
    clearTimeout(global.timer);
    updateStateOfControlsBarPlayPauseButton();
    global.noSleep.disable();
}

/* #region  Auto Scroll Read */
function autoscrollRead() {
    var element = document.getElementById(`text-paragraph-${global.currentParagraph}`);
    if (element) {
        scrollToElement(element);

        if (global.isAutoScrolling) {
            var wpm = localStorage.getItem('wordsPerMinute');
            var numberOfWords = element.textContent.split(' ').length;
            var timeout = numberOfWords / (wpm / 60.0 / 1000.0);
            clearTimeout(global.timer);
            global.timer = setTimeout(() => {
                if (global.isAutoScrolling) {
                    changeCurrentParagraph(global.currentParagraph + 1);
                }
            }, timeout);
        }
    }
}
/* #endregion */

/* #region Text To Speech */

function autoscrollTTS() {
    if (!global.ttsLanguage) {
        loadAndPlayTextToSpeech();
    } else {
        textToSpeech();
    }
}

function loadAndPlayTextToSpeech() {
    // list of languages is probably not loaded, wait for it
    if (window.speechSynthesis.getVoices().length == 0) {
        window.speechSynthesis.onvoiceschanged = loadTextToSpeechLanguage();
    }
    else {
        // languages list available, no need to wait
        loadTextToSpeechLanguage()
    }
}

function loadTextToSpeechLanguage() {
    // get all voices that browser offers
    var available_voices = window.speechSynthesis.getVoices();

    // this will hold an english voice
    var english_voice = '';

    // find voice by language locale "en-US"
    // if not then select the first voice
    for (var i = 0; i < available_voices.length; i++) {
        if (available_voices[i].lang === 'en-US') {
            english_voice = available_voices[i];
            break;
        }
    }
    if (english_voice === '')
        english_voice = available_voices[0];
    global.ttsLanguage = english_voice;
    textToSpeech();
}

function textToSpeech() {
    var element = document.getElementById(`text-paragraph-${global.currentParagraph}`);
    if (element) {
        scrollToElement(element);

        if (global.isAutoScrolling) {
            // new SpeechSynthesisUtterance object
            var utter = new SpeechSynthesisUtterance();
            utter.rate = getTTSRateForSpeechSynthesisUtterance();
            utter.pitch = 1;
            utter.text = element.textContent;
            utter.voice = global.ttsLanguage;

            // event after text has been spoken
            utter.onend = function () {
                global.utter = null;
                if (global.isAutoScrolling) {
                    changeCurrentParagraph(global.currentParagraph + 1);
                }
            }

            // speak
            window.speechSynthesis.speak(utter);
            global.utter = utter;
        }
    }
}

function getTTSRateForSpeechSynthesisUtterance() {
    var userVisibleRate = parseFloat(localStorage.getItem('autoscrollTTSRate'));   // UI displays numbers 1 through 7
    var speechSynthesisRate = 1.0;                                      // Convert to rate between 1.0 to 1.6
    userVisibleRate -= 1.0;
    userVisibleRate /= 10.0;
    speechSynthesisRate += userVisibleRate;
    return speechSynthesisRate;
}

/* #endregion */

/* #region  Auto Scroll Events */

function pageDown() {
    var scrollByAmount = global.windowHeight * 0.90;
    $('html, body').animate({
        scrollTop: `+=${scrollByAmount}`
    }, 400);
}

function changePage(url) {
    let href = `?url=${url}`
    const bookmarkId = $('#read-bookmark-id').val()
    if (bookmarkId) {
        href += `&bookmark=${bookmarkId}`
    }
    window.location.href = href;
}

function scrollToElement(element) {
    $(element).addClass('active-paragraph');
    $('html, body').animate({
        scrollTop: $(element).offset().top - global.windowHeight / 2.5
    }, 400);
}

function changeCurrentParagraph(newParagraph) {
    var element = $(`#text-paragraph-${newParagraph}`);
    if (element.length) {
        $(`#text-paragraph-${global.currentParagraph}`).removeClass('active-paragraph');
        global.currentParagraph = newParagraph;
        autoscrollIfEnabled();
    } else if (newParagraph > 0) {
        stopAutoscroll();
        if (localStorage.getItem('autoloadNext') === 'true') {
            $('#nextpage-preloader').show();
            clearTimeout(global.timer);
            global.timer = setTimeout(() => {
                $('#next-page-button').click();
            }, 3000);
        }
    }
}

/* #endregion */

/* #endregion */

/* #region  Page Navigation */

function nextPageClicked(url) {
    localStorage.setItem('currentPageLink', url);
    changePage(url);
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