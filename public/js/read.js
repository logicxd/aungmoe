var global = {
    currentParagraph: 0,
    isAutoScrolling: false,
    windowHeight: document.documentElement.clientHeight
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
    global.isAutoScrolling = getCookie('autoscroll-read') === 'true' || getCookie('autoscrollTTS') === 'true';
    global.windowHeight = document.documentElement.clientHeight;
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
    stopAutoscroll();
    pageDown();
});

$('#floating-settings-button').click(() => {
    stopAutoscroll();
});

$('#autoscroll-read').click(() => {
    $('#autoscroll-text-to-speech').prop('checked', false);
    updateStateOfValues();
});

$('#autoscroll-text-to-speech').click(() => {
    $('#autoscroll-read').prop('checked', false);
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
        autoscrollRead: $('#autoscroll-read').is(':checked'),
        wordsPerMinute: $('#words-per-minute').val(),
        autoscrollTTS: $('#autoscroll-text-to-speech').is(':checked'),
        autoscrollTTSRate: $('#text-to-speech-rate').val()
    };
    settings.urlChanged = currentUrl !== settings.url;
    settings.wordsPerMinute = settings.wordsPerMinute <= 0 ? 270 : settings.wordsPerMinute;

    setCookie('currentPageLink', settings.url);
    setCookie('autoloadNext', settings.autoloadNext);
    setCookie('autoscroll-read', settings.autoscrollRead);
    setCookie('wordsPerMinute', settings.wordsPerMinute);
    setCookie('autoscrollTTS', settings.autoscrollTTS);
    setCookie('autoscrollTTSRate', settings.autoscrollTTSRate);

    global.isAutoScrolling = settings.autoscrollRead || settings.autoscrollTTS;

    return settings;
}

function updateDefaultValues() {
    var autoloadNext = getCookie('autoloadNext') == null ? true : getCookie('autoloadNext');
    $('#autoload-next').prop('checked', autoloadNext);
    $('#autoscroll-read').prop('checked', getCookie('autoscroll-read'));
    $('#words-per-minute').val(getCookie('wordsPerMinute'));
    $('#autoscroll-text-to-speech').prop('checked', getCookie('autoscrollTTS'));
    if (getCookie('autoscrollTTSRate')) {
        $('#text-to-speech-rate').val(getCookie('autoscrollTTSRate'));
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

function pageDown() {
    var scrollByAmount = global.windowHeight * 0.90;
    $('html, body').animate({
        scrollTop: `+=${scrollByAmount}`
    }, 400);
}

function changePage(url) {
    window.location.href = `?url=${url}`;
}

function autoscrollIfEnabled() {
    if (!global.isAutoScrolling) {
        return;
    }

    if (getCookie('autoscroll-read') === 'true') {
        autoscrollRead();
    } else if (getCookie('autoscrollTTS') === 'true') {
        autoscrollTTS();
    }
}

function stopAutoscroll() {
    global.isAutoScrolling = false;
    window.speechSynthesis.cancel();
}

function autoscrollRead() {
    var element = document.getElementById(`text-paragraph-${global.currentParagraph++}`);
    if (element) {
        scrollToElement(element);
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

function autoscrollTTS() {
    if (!global.ttsLanguage) {
        loadAndPlayTextToSpeech();
    } else {
        textToSpeech(); 
    }
}

function loadAndPlayTextToSpeech() {
    // list of languages is probably not loaded, wait for it
    if(window.speechSynthesis.getVoices().length == 0) {
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
	for(var i=0; i<available_voices.length; i++) {
		if(available_voices[i].lang === 'en-US') {
			english_voice = available_voices[i];
			break;
		}
	}
	if(english_voice === '')
        english_voice = available_voices[0];
    global.ttsLanguage = english_voice;
    textToSpeech();
}

function textToSpeech() {
    var element = document.getElementById(`text-paragraph-${global.currentParagraph++}`);
    if (element) {
        scrollToElement(element);

        // new SpeechSynthesisUtterance object
	    var utter = new SpeechSynthesisUtterance();
        utter.rate = getTTSRateForSpeechSynthesisUtterance();
        utter.pitch = 1;
        utter.text = element.textContent;
        utter.voice = global.ttsLanguage;

        // event after text has been spoken
        utter.onend = function() {
            global.utter = null;
            autoscrollIfEnabled();
        }

        // speak
        window.speechSynthesis.speak(utter);
        global.utter = utter;
    } else {
        if (getCookie('autoloadNext') === 'true') {
            $('#nextpage-preloader').show();
            setTimeout(function() {
                $('#next-page-button').click();
            }, 3000);
        }
    }
}

function getTTSRateForSpeechSynthesisUtterance() {
    var userVisibleRate = parseFloat(getCookie('autoscrollTTSRate'));   // UI displays numbers 1 through 7
    var speechSynthesisRate = 1.0;                                      // Convert to rate between 1.0 to 1.6
    userVisibleRate -= 1.0;
    userVisibleRate /= 10.0;
    speechSynthesisRate += userVisibleRate;
    return speechSynthesisRate;
}

function scrollToElement(element) {
    $('html, body').animate({
        scrollTop: $(element).offset().top - global.windowHeight/2.5
    }, 400);
}