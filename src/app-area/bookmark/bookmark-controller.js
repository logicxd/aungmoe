"use strict";

/* #region  Imports */
var express = require('express');
var router = express.Router();
var path = require('path');
var utility = require('../utility')
var database = require('./js/database')
var mongoose = require('mongoose')
var UserModel = require('./db-models/User')
/* #endregion */

var route = 'bookmark'
utility.setupRouterPaths(router, __dirname)
database.connectIfNeeded()

// Create an instance of model SomeModel
var user = new UserModel({ username: 'test1234', passwordHash: 'pass1234', fullName: 'David' });

// Save the new model instance, passing a callback
user.save(function (err) {
    if (err) {
        console.error(err.message)
        return
    }
    console.log('saved')
    // saved!
});

router.get('/', async function (req, res) {
    return res.render(path.join(__dirname, 'view/login'), {
        title: 'Login to Bookmark - Aung Moe',
        description: 'Login page to access bookmark for reading materials',
        css: [`${route}/css/login.css`]
    })
})

module.exports = router