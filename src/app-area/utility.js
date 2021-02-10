"use strict";

var express = require('express');
var path = require('path');

function setupRouterPaths(router, directory, route) {
    if (route) {
        route = `/${route}`
    } else {
        route = ''
    }

    router.use(`${route}/js`, express.static(path.join(directory, 'js')));
    router.use(`${route}/css`, express.static(path.join(directory, 'css')));
    router.use(`${route}/media`, express.static(path.join(directory, 'media')));
    router.use(`${route}/page`, express.static(path.join(directory, 'page')));
}

module.exports = {
    setupRouterPaths
}