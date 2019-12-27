var height = document.documentElement.clientHeight;

$('#submit').click(() => {
    var url = $('#url').val();
    var autoloadNext = $('#autoload-next').is(':checked');
    setCookie('autoloadNext', autoloadNext);
    window.location.href = `?autoloadNext=${autoloadNext}&url=${url}`;
});

$('.tap-to-scroll').click(() => {
    var height = document.documentElement.clientHeight;
    var scrollByHeight = height * 0.90;
    window.scrollBy(0, scrollByHeight);
});

function autoscroll() {
    var element = document.getElementById("text-paragraph-10");
    element.scrollIntoView({block: "center"});
}