"use strict";

/* #region  Imports */
var express = require('express')
var router = express.Router()
var path = require('path')
var utility = require('../utility')
var moment = require('moment')
var { body, validationResult } = require('express-validator')
var NotionRecurringModel = require('../../database/model/NotionRecurring')
var mongoose = require('mongoose');
var { RecurringEventsService } = require('./service/recurring-events-service')
/* #endregion */

/* #region  Set up routes */
var route = 'recurring-events'
utility.setupRouterPaths(router, __dirname)
/* #endregion */

/* #region  GET /recurring-events */
router.get('/', async function (req, res) {
    if (!req.isAuthenticated()) {
        return res.redirect(`/login?redirectUrl=${route}`)
    }

    let recurringConfigs = []
    try {
        let dbConfigs = await NotionRecurringModel.find({ user: req.user }).sort({ modifiedDate: 'desc' }).lean()
        recurringConfigs = dbConfigs.map(x => {
            return {
                title: x.title,
                url: `${route}/${x._id.toString()}`,
                lastSynced: moment(x.lastSyncedDate).format('YYYY-MM-DD HH:mm')
            }
        })
    } catch (error) {
        console.error(error)
    }

    return res.render(path.join(__dirname, 'view/recurring-events'), {
        title: 'Recurring Events - Aung Moe',
        description: 'Manage recurring events in Notion databases',
        css: [`${route}/css/recurring-events.css`],
        js: [`${route}/js/recurring-events.js`],
        recurringConfigs: recurringConfigs
    })
})
/* #endregion */

/* #region  POST /recurring-events */
router.post('/', requiredValidators(), async function (req, res) {
    if (!req.isAuthenticated()) {
        return res.status(403).send("You're not signed in, please sign in again.")
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        await NotionRecurringModel.create({
            user: req.user,
            title: req.body.title,
            databaseId: req.body.databaseId,
            secretKey: req.body.secretKey
        })
        return res.status(204).end()
    } catch (error) {
        console.error(error)
        return res.status(500).send('Unhandled exception')
    }
})
/* #endregion */

/* #region  GET /recurring-events/{id} */
router.get('/:id', async function (req, res) {
    let id = req.params['id']

    let config = {}
    try {
        config = await NotionRecurringModel.findById(new mongoose.Types.ObjectId(id))

        if (!config) {
            throw `Recurring events config not found with id ${id}`
        }

    } catch (error) {
        console.error(error)
        res.status(404)
        return res.render(path.join(__dirname, 'view/recurring-events-unknown-page'), {
            title: 'Recurring Events - Not Found',
            description: 'Config not found!',
            css: [`/${route}/css/recurring-events.css`],
            js: [`/${route}/js/recurring-events.js`]
        });
    }

    return res.render(path.join(__dirname, 'view/recurring-events-detail'), {
        title: `Recurring Events - ${config.title}`,
        description: 'Manage recurring events in Notion',
        css: [`/${route}/css/recurring-events.css`],
        js: [global.js.axios, `/${route}/js/recurring-events.js`, `/${route}/js/recurring-events-detail.js`],
        id: id,
        lastSynced: moment(config.lastSyncedDate).format('YYYY-MM-DD HH:mm')
    })
})
/* #endregion */

/* #region  GET /recurring-events/{id}/embed */
router.get('/:id/embed', async function (req, res) {
    let id = req.params['id']

    let config = {}
    try {
        config = await NotionRecurringModel.findById(new mongoose.Types.ObjectId(id))

        if (!config) {
            throw `Recurring events config not found with id ${id}`
        }

    } catch (error) {
        console.error(error)
        res.status(404)
        return res.render(path.join(__dirname, 'view/recurring-events-unknown-page'), {
            title: 'Recurring Events - Not Found',
            description: 'Config not found!',
            css: [`/${route}/css/recurring-events.css`],
            js: [`/${route}/js/recurring-events.js`],
            layout: 'empty-template'
        });
    }

    return res.render(path.join(__dirname, 'view/recurring-events-embed'), {
        title: `Sync Recurring Events`,
        description: 'Sync recurring events in Notion',
        css: [`/${route}/css/recurring-events.css`],
        js: [global.js.axios, `/${route}/js/recurring-events-embed.js`],
        id: id,
        layout: 'empty-template'
    })
})
/* #endregion */

/* #region  POST /recurring-events/{id}/sync */
router.post('/:id/sync', async function (req, res) {
    try {
        let id = req.params['id']
        let config = await NotionRecurringModel.findById(new mongoose.Types.ObjectId(id))
        if (!config) {
            throw `Recurring events config not found with id ${id}`
        }

        const service = new RecurringEventsService(config.secretKey, config.databaseId)
        const result = await service.processRecurringEvents(config.lastSyncedDate)

        config.lastSyncedDate = new Date()
        await config.save()

        return res.status(200).json({
            success: true,
            created: result.created,
            updated: result.updated,
            skipped: result.skipped,
            errors: result.errors
        })
    } catch (error) {
        console.error(`Error syncing recurring events: ${error}`)
        return res.status(500).json({
            success: false,
            error: error.message || 'Unknown error'
        })
    }
})
/* #endregion */

/* #region  Helper Methods */

function requiredValidators() {
    return [
        body('title').trim().notEmpty(),
        body('databaseId').trim().notEmpty(),
        body('secretKey').trim().notEmpty()
    ]
}

/* #endregion */

module.exports = router