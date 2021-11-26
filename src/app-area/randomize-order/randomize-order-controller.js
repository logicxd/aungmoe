"use strict";

/* #region  Imports */
var express = require('express');
var router = express.Router();
var path = require('path');
var utility = require('../utility')
/* #endregion */

/* #region  Set up routes */
var route = 'randomize-order'
utility.setupRouterPaths(router, __dirname)
/* #endregion */

/* #region  GET /bookmark */
router.get('/', function (req, res) {
    return res.render(path.join(__dirname, `view/${route}`), {
        title: 'Randomize Order - Aung Moe',
        description: 'Re-order list of items in a random order',
        css: ['/css/default.css'],
        js: [`${route}/js/${route}.js`]
    })
})
/* #endregion */

module.exports = router