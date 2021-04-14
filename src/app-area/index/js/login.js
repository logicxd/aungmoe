$(document).ready(() => {
    $.ajax({
        method: 'GET',
        url: 'login/validate',
        success: function (res) {
            const redirectUrl = $('#login-redirect-url').val()
            window.location.href = `/${redirectUrl ?? ''}`;
        },
        error: function (error) {
            $('#login-form').css('visibility', 'visible')
            $('#login-loading-screen').css('display', 'none')
        }
    }).always(() => {
        $('#bookmark-loading-screen').css('display', 'none')
    })
})