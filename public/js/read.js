$('#submit').click(() => {
    var url = $('#url').val();
    var autoloadNext = $('#autoload-next').is(':checked');
    window.location.href = `?url=${url}&autoloadNext=${autoloadNext}`;
});