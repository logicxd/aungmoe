$(document).ready(function() {
    $('#states-' + idNumber).css('display', 'inline-block');
    $('#occupations-' + idNumber).css('display', 'inline-block');

    $('.carousel.carousel-slider').carousel({
        fullWidth: false,
        indicators: true
      });
});

var idNumber = 0;
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