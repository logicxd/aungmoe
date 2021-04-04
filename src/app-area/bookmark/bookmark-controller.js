"use strict";

/* #region  Imports */
var express = require('express');
var router = express.Router();
var path = require('path');
var appDir = path.dirname(require.main.filename);
var utility = require('../utility')
var database = require('../index/js/database')
var mongoose = require('mongoose')
var UserModel = require('../index/database-models/User')
var passport = require('passport')
/* #endregion */

var route = 'bookmark'
utility.setupRouterPaths(router, __dirname)
database.connectIfNeeded()

// // Create an instance of model SomeModel
// var user = new UserModel({ username: 'test12345', fullName: 'David' });

// UserModel.register(user, 'uniquepass', err => {
//     if (err) {
//         console.error(err.message)
//         return
//     }
//     console.log('user registered')
//     // saved!    
// })

router.get('/', async function (req, res) {
    if (req.isAuthenticated()) {
        console.log(`authenticated, ${req.user}`)
    } 
    
    return res.redirect('/login')    
})

module.exports = router