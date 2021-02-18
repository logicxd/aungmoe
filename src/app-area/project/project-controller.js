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
        description: 'Aung\'s personal website',
        css: [global.css.material_icons, `${route}/css/read.css`, global.css.animate_css, global.css.fontawesome],
        js: [global.js.jquery, global.js.materialize, global.js.header, `${route}/js/read-utility.js`, `${route}/js/read-setup.js`, global.js.footer]
    })
})

module.exports = router