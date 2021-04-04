"use strict";

/* #region  Imports */
var express = require('express');
var router = express.Router();
var path = require('path');
var utility = require('../utility')
/* #endregion */

var route = 'project'
utility.setupRouterPaths(router, __dirname)

router.get('/', async function (req, res) {
    return res.render(path.join(__dirname, 'view/project'), {
        title: 'Project - Aung Moe',
        description: 'List of projects',
        css: [`${route}/css/project.css`],
        projects: listOfProjects()
    })
})

function listOfProjects() {
    return [{
        title: 'Combine Email Bills Using Gmail API',
        url: 'https://github.com/logicxd/Combine-Email-Bills-Using-Gmail-API',
        dateString: '2021',
        category: 'Node.js, Gmail, Nodemailer, Job Scheduler'
        // github: 'asdf',
        // image: 'https://www.logolynx.com/images/logolynx/6d/6d7a4ee07338032263b8d6c8679f13ae.jpeg',
        // year: '2021',
        // tags: ['gmail, server, job scheduler'] // todo
    }, {
        title: 'Webtoon Reading Tool',
        url: '/read-webtoon',
        dateString: '2021',
        category: 'Scripting'
    }, {
        title: 'Novel Reading Tool',
        url: '/read-novel',
        dateString: '2019',
        category: 'Scripting'
    }, {
        title: 'Make a Blog with Markdown Using NodeJS',
        url: 'https://github.com/logicxd/blog-nodejs',
        dateString: '2018',
        category: 'Blog, Markdown, Syntax Highlighting'
    }, {
        title: 'My Personal Blog',
        url: '/blog',
        dateString: '2018',
        category: 'Blog'
    }]
}

module.exports = router