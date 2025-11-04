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
var sanitizeHtml = require('sanitize-html')
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
        console.error('Error fetching recurring configs:', error)
        return res.status(500).render('error', { message: 'Failed to load recurring events configurations' })
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
        return res.status(403).json({ error: "You're not signed in, please sign in again." })
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const newConfig = await NotionRecurringModel.create({
            user: req.user,
            title: sanitizeHtml(req.body.title, { allowedTags: [], allowedAttributes: {} }),
            databaseId: req.body.databaseId.trim(),
            secretKey: req.body.secretKey.trim()
        })

        return res.status(201).json({
            id: newConfig._id,
            url: `/${route}/${newConfig._id}`
        })
    } catch (error) {
        console.error('Error creating recurring config:', error)
        return res.status(500).json({ error: 'Failed to create configuration' })
    }
})
/* #endregion */

/* #region  POST /recurring-events/scheduler/sync-all */
router.post('/scheduler/sync-all', async function (req, res) {
    // Authenticate using secret token
    const authHeader = req.headers['x-scheduler-token']
    const schedulerToken = process.env.RECURRING_EVENTS_SCHEDULER_TOKEN

    if (!schedulerToken) {
        console.error('RECURRING_EVENTS_SCHEDULER_TOKEN not configured')
        return res.status(500).json({
            success: false,
            error: 'Scheduler not configured'
        })
    }

    if (authHeader !== schedulerToken) {
        console.warn('Unauthorized scheduler sync attempt')
        return res.status(401).json({
            success: false,
            error: 'Unauthorized'
        })
    }

    try {
        const allConfigs = await NotionRecurringModel.find({}).lean()
        console.log(`Scheduler: Processing ${allConfigs.length} recurring event configuration(s)`)

        const results = []
        let totalCreated = 0
        let totalUpdated = 0
        let totalSkipped = 0
        let totalErrors = []

        for (const config of allConfigs) {
            try {
                const fullConfig = await NotionRecurringModel.findById(config._id)
                const decryptedSecretKey = fullConfig.getDecryptedSecretKey()
                const service = new RecurringEventsService(decryptedSecretKey, fullConfig.databaseId)
                const result = await service.processRecurringEvents(fullConfig.lastSyncedDate)

                fullConfig.lastSyncedDate = new Date()
                await fullConfig.save()

                totalCreated += result.created
                totalUpdated += result.updated
                totalSkipped += result.skipped
                totalErrors.push(...result.errors)

                results.push({
                    configId: config._id,
                    title: config.title,
                    success: true,
                    created: result.created,
                    updated: result.updated,
                    skipped: result.skipped,
                    errors: result.errors
                })

                console.log(`Scheduler: Processed config "${config.title}" - Created: ${result.created}, Updated: ${result.updated}, Skipped: ${result.skipped}`)
            } catch (error) {
                console.error(`Scheduler: Error processing config ${config._id}:`, error)
                results.push({
                    configId: config._id,
                    title: config.title,
                    success: false,
                    error: error.message || 'Unknown error'
                })
                totalErrors.push(`Config ${config._id}: ${error.message}`)
            }
        }

        console.log(`Scheduler: Completed - Total Created: ${totalCreated}, Updated: ${totalUpdated}, Skipped: ${totalSkipped}, Errors: ${totalErrors.length}`)

        return res.status(200).json({
            success: true,
            summary: {
                totalConfigs: allConfigs.length,
                totalCreated,
                totalUpdated,
                totalSkipped,
                totalErrors: totalErrors.length
            },
            results
        })
    } catch (error) {
        console.error('Scheduler: Fatal error during sync-all:', error)
        return res.status(500).json({
            success: false,
            error: error.message || 'Unknown error'
        })
    }
})
/* #endregion */

/* #region  GET /recurring-events/{id} */
router.get('/:id', async function (req, res) {
    if (!req.isAuthenticated()) {
        return res.redirect(`/login?redirectUrl=${route}`)
    }

    const id = req.params['id']

    try {
        const config = await findConfigByIdAndUser(id, req.user._id)

        return res.render(path.join(__dirname, 'view/recurring-events-detail'), {
            title: `Recurring Events - ${config.title}`,
            description: 'Manage recurring events in Notion',
            css: [`/${route}/css/recurring-events.css`],
            js: [global.js.axios, `/${route}/js/recurring-events.js`, `/${route}/js/recurring-events-detail.js`],
            id: id,
            lastSynced: moment(config.lastSyncedDate).format('YYYY-MM-DD HH:mm')
        })
    } catch (error) {
        console.error(`Error loading config ${id}:`, error)
        const statusCode = error.statusCode || 500
        res.status(statusCode)
        return res.render(path.join(__dirname, 'view/recurring-events-unknown-page'), {
            title: 'Recurring Events - Not Found',
            description: error.message || 'Config not found!',
            css: [`/${route}/css/recurring-events.css`],
            js: [`/${route}/js/recurring-events.js`]
        })
    }
})
/* #endregion */

/* #region  GET /recurring-events/{id}/embed */
router.get('/:id/embed', async function (req, res) {
    const id = req.params['id']

    try {
        const config = await findConfigById(id)

        return res.render(path.join(__dirname, 'view/recurring-events-embed'), {
            title: `Sync Recurring Events`,
            description: 'Sync recurring events in Notion',
            css: [`/${route}/css/recurring-events.css`],
            js: [global.js.axios, `/${route}/js/recurring-events-embed.js`],
            id: id,
            layout: 'empty-template'
        })
    } catch (error) {
        console.error(`Error loading config ${id}:`, error)
        const statusCode = error.statusCode || 500
        res.status(statusCode)
        return res.render(path.join(__dirname, 'view/recurring-events-unknown-page'), {
            title: 'Recurring Events - Not Found',
            description: error.message || 'Config not found!',
            css: [`/${route}/css/recurring-events.css`],
            js: [`/${route}/js/recurring-events.js`],
            layout: 'empty-template'
        })
    }
})
/* #endregion */

/* #region  POST /recurring-events/{id}/sync */
router.post('/:id/sync', async function (req, res) {
    try {
        const id = req.params['id']
        const config = await findConfigById(id)

        const decryptedSecretKey = config.getDecryptedSecretKey()
        const service = new RecurringEventsService(decryptedSecretKey, config.databaseId)
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
        console.error(`Error syncing recurring events:`, error)
        const statusCode = error.statusCode || 500
        return res.status(statusCode).json({
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

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id)
}

async function findConfigById(id) {
    if (!isValidObjectId(id)) {
        throw new ValidationError('Invalid ID format')
    }

    const config = await NotionRecurringModel.findById(new mongoose.Types.ObjectId(id))

    if (!config) {
        throw new NotFoundError(`Recurring events config not found with id ${id}`)
    }

    return config
}

async function findConfigByIdAndUser(id, userId) {
    if (!isValidObjectId(id)) {
        throw new ValidationError('Invalid ID format')
    }

    const config = await NotionRecurringModel.findOne({
        _id: new mongoose.Types.ObjectId(id),
        user: userId
    })

    if (!config) {
        throw new NotFoundError(`Recurring events config not found with id ${id}`)
    }

    return config
}

/* #endregion */

/* #region  Custom Error Classes */

class ValidationError extends Error {
    constructor(message) {
        super(message)
        this.name = 'ValidationError'
        this.statusCode = 400
    }
}

class NotFoundError extends Error {
    constructor(message) {
        super(message)
        this.name = 'NotFoundError'
        this.statusCode = 404
    }
}

/* #endregion */

module.exports = router