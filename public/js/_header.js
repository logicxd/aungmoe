$(document).ready(function () {
    // M.AutoInit();
    $('.materialboxed').materialbox();
    $('.sidenav').sidenav();
});

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

$.fn.extend({
    animateCss: function (animationName, callback) {
        this.addClass('animated ' + animationName).one(animationEnd, function () {
            $(this).removeClass('animated ' + animationName);
            if (typeof callback === 'function') callback();
        });

        return this;
    },
});

// Scroling taken from https://stackoverflow.com/a/4326907
var lastScrollTop = 0;
var topNavbar = $('#top-navbar');
$(window).scroll(function (event) {
    var st = $(this).scrollTop();
    if (st > lastScrollTop) {
        // Scroll down
        if (topNavbar.css('display') !== 'none') {
            topNavbar.animateCss('slideOutUp', function () {
                topNavbar.css('display', 'none');
            });
        }
    } else {
        // Scroll up
        if (topNavbar.css('display') === 'none') {
            topNavbar.css('display', 'block').animateCss('slideInDown');
        }
    }
    lastScrollTop = st;
});