// Setup disqus
(function () {  // REQUIRED CONFIGURATION VARIABLE: EDIT THE SHORTNAME BELOW
    var d = document, s = d.createElement('script');

    s.src = '//aungmoe.disqus.com/embed.js';  // IMPORTANT: Replace EXAMPLE with your forum shortname!

    s.setAttribute('data-timestamp', +new Date());
    (d.head || d.body).appendChild(s);
})();

$(document).ready(function () {
    $('.tooltipped').tooltip();
    $('.fixed-action-btn').floatingActionButton();
});
