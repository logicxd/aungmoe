"use strict";
var express = require('express');
var router = express.Router();
var path = require('path');
var utility = require('../utility')
var passport = require('passport')
var database = require('../index/js/database')

var route = 'index'
utility.setupRouterPaths(router, __dirname, route)
database.connectIfNeeded()

router.get('/', function (req, res) {
    res.render(path.join(__dirname, 'view/index'), {
        title: 'Aung Moe',
        description: 'Aung\'s personal website',
        css: [`${route}/css/index.css`, global.css.animate_css],
        js: [`${route}/js/index.js`],
        data: {
            occupations: [
                { state: "Experienced in", occupation: "full-stack development" },
                { state: "Contributes to", occupation: "open source projects" },
                { state: "Partook in", occupation: "research studies at UCI" },
                { state: "Graduated with", occupation: "honors in Computer Science" },
            ],
            highlights: [
                {
                    date: "October 1, 2018",
                    title: "First Full-Time Job!",
                    description: `Excited to start working as an associate iOS Developer for <a href="https://www.veeva.com/">
                    Veeva</a> on the CRM team!`,
                    image: {
                        href: "https://www.veeva.com/",
                        src: "https://www.logolynx.com/images/logolynx/6d/6d7a4ee07338032263b8d6c8679f13ae.jpeg"
                    },
                    action: {
                        name: "WEBSITE",
                        link: "https://www.veeva.com/products/multichannel-crm/"
                    }
                },
                {
                    date: "June 16, 2018",
                    title: "Graduated!",
                    description: `Earned my B.S. in Computer Science from University of California Irvine!`,
                    image: {
                        href: "https://photos.app.goo.gl/z9ctjcqYPz4tj2LD6",
                        src: "https://lh3.googleusercontent.com/Gz1oGOjhdVmfVJPyZDrdeIjVmxMYUabBDGBjw2jCJUu9ONFSZoeFLfSrbvql2cJEt0XFYldvnvzPCPs7Mj1OZ-lf2epZerYkrwtJq8BfLHo0FnFgEZDyW1zWTOh3WtVlGch2TAhdkf1_gjAw829vV-bVNlFUDo42B7iZIqGHLeDXWEBHxIMbtmSBDgG0CHUftU5El4mg9zf8G4cRztj7HK5ScuKtykwdk2wyoXqAj1xk8nGsOacuivpMl1ewiXU10u7UatDbZtaJRxoAzR7G7_n34mFfgrElewXaRx2OATTKjHfy6ZIIgQfINf8Vsxxf3mwleRXNkUsGTm-nJSjFzJdmOOItbUaE0-PgHq52ko2oOMNMevBUeiqua0owqQAiFQPdy9awKz8rPquLP6GK05XAYFU4s2UKsEOkDP3lzCx8Cv4gQmbGKZXab2JunQIfE-j_rmZ5GE6ulDcvNeCBLc1OGOiGwSux3KMBQxy5bRhtuVNfdzyK2Qt9eueWPp9q_AMu48zztW4Br1HgnQgFAsXHhZZsj0dmgOFu2X5qXPfG6AIqVhjn5KsrHQkxVQgHLHFJsCkc2ktub5VtftrUQXi37hiulQu31V8r3eXkRBVXJtaAR9TIMBXV__5-6ui1INke_IvZWit_Qjz78dNB9ykbj50DwsXV=w1679-h925-no"
                    },
                    action: {
                        name: "PICTURES",
                        link: "https://photos.app.goo.gl/z9ctjcqYPz4tj2LD6"
                    },
                },
                {
                    date: "Dec. 20, 2017",
                    title: "AI Class Tournament",
                    description: `Placed 2nd in a class tournmant in making an AI bot.`,
                    image: {
                        href: "https://github.com/logicxd/Wumpus-World-AI",
                        src: "https://wumpusproject.files.wordpress.com/2012/11/img12.gif"
                    },
                    action: {
                        name: "GITHUB",
                        link: "https://github.com/logicxd/Wumpus-World-AI"
                    },
                }
            ],
            projects: [
                { 
                    image: "https://user-images.githubusercontent.com/12219300/43773157-a362492e-99f9-11e8-8836-15771b6dfd99.gif", 
                    title: "Wumpus World AI", 
                    skills: [
                        {
                            image: `${route}/media/skills/java.svg`,
                            name: "Java"
                        }
                    ],
                    description: `<b>2nd highest scoring AI bot</b> for a class tournament that aims to find the gold and escape the Wumpus
                        World with the best possible score.`,
                    github: "https://github.com/logicxd/Wumpus-World-AI",
                    website: null
                },
                { 
                    image: "https://cloud.githubusercontent.com/assets/12219300/19020428/63fcaca2-885d-11e6-99db-660d4264d120.gif", 
                    title: "QuartoAI", 
                    skills: [
                        {
                            image: `${route}/media/skills/objective-c.svg`,
                            name: "Objective-C"
                        }
                    ],
                    description: `A Quarto board game mimic that you can play against your friend or play against
                    <b>an advanced bot that will never lose!</b>`,
                    github: "https://github.com/logicxd/QuartoAI",
                    website: null
                },
                { 
                    image: "https://user-images.githubusercontent.com/12219300/43773844-eed81c38-99fb-11e8-8e17-0e1e47adf6d3.gif", 
                    title: "Church Web Application", 
                    skills: [
                        {
                            image: `${route}/media/skills/javascript.svg`,
                            name: "JavaScript"
                        },
                        {
                            image: `${route}/media/skills/nodejs.png`,
                            name: "NodeJS"
                        }
                    ],
                    description: `Practiced web development while building a sample church website that may be used in a church that I go to.`,
                    github: "https://github.com/logicxd/Church-WebApp-Template",
                    website: {
                        link: "https://aungmoe-church.herokuapp.com/",
                        name: "Demo"
                    }
                }
            ]
        }
    });
});

router.get('/login', async function (req, res) {
    if (req.isAuthenticated()) {
        console.log(`authenticated, ${req.user}`)
        return res.redirect('/')
    } else {
        return res.render(path.join(__dirname, 'view/login'), {
            title: 'Login - Aung Moe',
            description: 'Login',
            css: [`${route}/css/login.css`],
            redirectUrl: req.query.redirectUrl
        })
    }
})

router.post('/login', passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }), function(req, res) {
    if (req.body.redirectUrl) {
        return res.redirect(req.body.redirectUrl)
    }
    return res.redirect('/');
});

module.exports = router;
