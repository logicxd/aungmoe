$(document).ready(function () {
    // M.AutoInit();
    $('.materialboxed').materialbox();
    $('.sidenav').sidenav();
});

function setCookie(name,value,days = 30) {
    var expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);
    document.cookie = `${name}=${value || ""};expires=${expirationDate.toUTCString()};path=/;samesite=strict;`;
    // document.cookie = `${name}=${value || ""};max-age=${days * 24 * 60 * 60};path=/;samesite=strict;`;
}
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}
function eraseCookie(name) {   
    document.cookie = name+'=; Max-Age=-99999999;';  
}

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