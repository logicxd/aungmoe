var idNumber = 0;
var animationEnd = (function (el) {
    var animations = {
        animation: 'animationend',
        OAnimation: 'oAnimationEnd',
        MozAnimation: 'mozAnimationEnd',
        WebkitAnimation: 'webkitAnimationEnd',
    };

    for (var t in animations) {
        if (el.style[t] !== undefined) {
            return animations[t];
        }
    }
    return 'animationend';
})(document.createElement('div'));

$(document).ready(function() {
    $('#states-' + idNumber).css('display', 'inline-block');
    $('#occupations-' + idNumber).css('display', 'inline-block');

    $('.carousel.carousel-slider').carousel({
        fullWidth: false,
        indicators: true
      });
});


$.fn.extend({
    animateCss: function (animationName, callback) {
        this.addClass('animated ' + animationName).one(animationEnd, function () {
            $(this).removeClass('animated ' + animationName);
            if (typeof callback === 'function') callback();
        });

        return this;
    },
});

$('.occupations').on(animationEnd, function (e) {
    if (e.originalEvent.animationName === 'expandUnderlineToFull') {
        var currentState = $('#states-' + idNumber);
        var currentOccupation = $('#occupations-' + idNumber++);
        var nextState = $('#states-' + idNumber);
        var nextOccupation = $('#occupations-' + idNumber);

        // No more occupations, loop back to the first one.
        if (nextOccupation.length === 0) {
            idNumber = 0;
            nextOccupation = $('#occupations-' + idNumber);
            nextState = $('#states-' + idNumber);
        }


        currentOccupation.animateCss('bounceOutDown', function () {
            nextOccupation.css('display', 'inline-block').animateCss('bounceInDown');
            currentOccupation.css('display', 'none');

            if (currentState.attr('data-value') !== nextState.attr('data-value')) {
                currentState.animateCss('fadeOut', function () {
                    currentState.css('display', 'none');
                });
                nextState.css('display', 'inline-block').animateCss('fadeIn');
            }
        });
    }
});