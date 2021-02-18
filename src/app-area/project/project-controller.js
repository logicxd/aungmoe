"use strict";

/* #region  Imports */
var express = require('express');
var router = express.Router();
var path = require('path');
var utility = require('../utility')
/* #endregion */

var route = 'project'
utility.setupRouterPaths(router, __dirname, route)

router.get('/', async function (req, res) {
    return res.render(path.join(__dirname, 'view/project'), {
        title: 'Project - Aung Moe',
        description: 'List of projects',
        css: [`${route}/css/read.css`]
    })
})

module.exports = router