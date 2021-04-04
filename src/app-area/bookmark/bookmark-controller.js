"use strict";

/* #region  Imports */
var express = require('express');
var router = express.Router();
var path = require('path');
var utility = require('../utility')
/* #endregion */

var route = 'bookmark'
utility.setupRouterPaths(router, __dirname)

router.get('/', async function (req, res) {
    return res.render(path.join(__dirname, 'view/login'), {
        title: 'Login to Bookmark - Aung Moe',
        description: 'Login page to access bookmark for reading materials',
        css: [`${route}/css/login.css`]
    })
})

module.exports = router