var animationEnd = (function(el) {
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
    animateCss: function(animationName, callback) {
        this.addClass('animated ' + animationName).one(animationEnd, function() {
            $(this).removeClass('animated ' + animationName);
            if (typeof callback === 'function') callback();
        });   
  
        return this;
    },
});

$('#occupation-1').on(animationEnd, function(e) {
    var animName = e.originalEvent.animationName;
    console.log(e);
    console.log(animName);
    if (animName === 'expandUnderlineToFull') {
        $('#occupation-1').animateCss('bounceOutDown', function() {
            $('#occupation-2').show().animateCss('bounceInDown');
            $('#occupation-1').hide();
        });
    }
});