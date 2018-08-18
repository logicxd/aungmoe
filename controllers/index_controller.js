"use strict";
var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
    res.render('index', { 
        title: 'Aung Moe',
        description: 'Aung\'s personal website',
        css: [global.css.material_icons, 'css/index.css', global.css.animate_css, global.css.fontawesome],
        js: [global.js.jquery, global.js.materialize, global.js.header, 'js/index.js', global.js.footer],
        data: {
            occupations: [
                { state: "Experienced in", occupation: "full-stack development" },
                { state: "Contributes to", occupation: "open source projects" },
                { state: "Partook in", occupation: "research studies at UCI" },
                { state: "Graduated with", occupation: "honors in Computer Science" },
            ],
            projects: [
                { 
                    image: "https://user-images.githubusercontent.com/12219300/43773157-a362492e-99f9-11e8-8836-15771b6dfd99.gif", 
                    title: "Wumpus World AI", 
                    skills: [
                        {
                            image: "img/index/skills/java.svg",
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
                            image: "img/index/skills/objective-c.svg",
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
                            image: "img/index/skills/javascript.svg",
                            name: "JavaScript"
                        },
                        {
                            image: "img/index/skills/nodejs.png",
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

module.exports = router;
