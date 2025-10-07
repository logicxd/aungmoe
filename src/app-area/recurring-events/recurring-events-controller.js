"use strict";

/* #region  Imports */
var express = require('express')
var router = express.Router()
var path = require('path')
var utility = require('../utility')
var axios = require('axios')
var moment = require('moment')
var { body, validationResult } = require('express-validator')
var NotionRecurringModel = require('../../database/model/NotionRecurring')
var mongoose = require('mongoose');
var { randomUUID } = require('crypto');
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

/* #region  PUT /recurring-events/{id}/sync */
router.put('/:id/sync', async function (req, res) {
    try {
        let id = req.params['id']
        let config = await NotionRecurringModel.findById(new mongoose.Types.ObjectId(id))
        if (!config) {
            throw `Recurring events config not found with id ${id}`
        }

        const result = await processRecurringEvents(config.secretKey, config.databaseId, config.lastSyncedDate)

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

/* #region  Notion API */

async function notionGetDatabase(apiKey, databaseId) {
    const options = {
        method: 'GET',
        url: `https://api.notion.com/v1/databases/${databaseId}`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Notion-Version': '2025-09-03'
        }
    }

    let res = await axios(options)
    return res.data
}

async function notionFetchPages(apiKey, dataSourceId, filter = null) {
    const options = {
        method: 'POST',
        url: `https://api.notion.com/v1/data_sources/${dataSourceId}/query`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Notion-Version': '2025-09-03',
            'Content-Type': 'application/json'
        },
        data: {
            page_size: 100,
            ...(filter && { filter }),
            sorts: [
                {
                    "property": "Date",
                    "direction": "ascending"
                }
            ]
        }
    }

    let res = await axios(options)
    return res.data
}

async function notionGetPage(apiKey, pageId) {
    const options = {
        method: 'GET',
        url: `https://api.notion.com/v1/pages/${pageId}`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Notion-Version': '2025-09-03'
        }
    }

    let res = await axios(options)
    return res.data
}

async function notionCreatePage(apiKey, dataSourceId, properties) {
    const options = {
        method: 'POST',
        url: `https://api.notion.com/v1/pages`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Notion-Version': '2025-09-03',
            'Content-Type': 'application/json'
        },
        data: {
            parent: {
                type: 'data_source_id',
                data_source_id: dataSourceId
            },
            properties: properties
        }
    }

    let res = await axios(options)
    return res.data
}

async function notionUpdatePage(apiKey, pageId, properties) {
    const options = {
        method: 'PATCH',
        url: `https://api.notion.com/v1/pages/${pageId}`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Notion-Version': '2025-09-03',
            'Content-Type': 'application/json'
        },
        data: {
            properties: properties
        }
    }

    let res = await axios(options)
    return res.data
}

/* #endregion */

/* #region  Recurring Event Processing */

async function processRecurringEvents(apiKey, databaseId, lastSyncedDate) {
    const result = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: []
    }

    try {
        // Get the database to retrieve the data source ID
        const database = await notionGetDatabase(apiKey, databaseId)
        const dataSourceId = database.data_sources[0]?.id || database.id

        // Fetch all pages within date range: from lastSyncedDate (or 14 days before today if not set) to 21 days from today
        const today = moment.utc()
        const startDate = lastSyncedDate
            ? moment.utc(lastSyncedDate).toISOString()
            : today.clone().subtract(14, 'days').startOf('day').toISOString()
        const endDate = today.clone().add(21, 'days').endOf('day').toISOString()

        const data = await notionFetchPages(apiKey, dataSourceId, {
            and: [
                {
                    property: "Date",
                    date: {
                        on_or_after: startDate
                    }
                },
                {
                    property: "Date",
                    date: {
                        on_or_before: endDate
                    }
                }
            ]
        })

        const allSourcePages = data.results

        for (const sourcePage of allSourcePages) {
            try {
                await processSourcePage(apiKey, dataSourceId, allSourcePages, sourcePage, result)
            } catch (error) {
                console.error(`Error processing source page ${sourcePage.id}: ${error}`)
                result.errors.push(`Page ${sourcePage.id}: ${error.message}`)
            }
        }

    } catch (error) {
        console.error(`Error in processRecurringEvents: ${error}`)
        result.errors.push(error.response.data.message || error.message || 'Unknown error')
    }

    return result
}

async function processSourcePage(apiKey, dataSourceId, allSourcePages, sourcePage, result) {
    const props = sourcePage.properties
    const frequency = props['Recurring Frequency']?.select?.name
    const cadence = props['Recurring Cadence']?.number || 1
    const recurringDays = props['Recurring Days']?.multi_select?.map(d => d.name) || []
    const lookaheadNumber = props['Recurring Lookahead Number']?.number || 0
    const dateTime = props['Date']?.date?.start
    let recurringId = props['Recurring ID']?.rich_text?.[0]?.plain_text
    const isRecurringSource = props['Recurring Source']?.checkbox === true

    // Validate
    if (!frequency || !dateTime || cadence < 0 || recurringDays.length === 0 || lookaheadNumber < 1) {
        result.skipped++
        return
    }

    // Skip if "Recurring Source" is not true
    if (!isRecurringSource) {
        result.skipped++
        return
    }

    // Ensure Recurring ID exists
    if (!recurringId) {
        recurringId = randomUUID()
        // Update the source page with the new UUID
        await notionUpdatePage(apiKey, sourcePage.id, {
            'Recurring ID': {
                rich_text: [
                    {
                        type: 'text',
                        text: {
                            content: recurringId
                        }
                    }
                ]
            }
        })
        console.log(`Generated new Recurring ID for page ${sourcePage.id}: ${recurringId}`)
    }

    // Since allSourcePages are sorted by date ascending, and this sourcePage has "Recurring Source" = true,
    // this must be the earliest event with "Recurring Source" marked as true
    const actualSourcePage = sourcePage

    // Find all future date pages with the same "Recurring ID" (excluding the source page itself)
    const sourceDateTime = moment.utc(dateTime)
    const futureEvents = allSourcePages
        .filter(p => {
            if (p.id === sourcePage.id) { return false }
            const pRecurringId = p.properties['Recurring ID']?.rich_text?.[0]?.plain_text
            if (pRecurringId !== recurringId) { return false }
            const pDateTime = moment.utc(p.properties['Date']?.date?.start)
            return pDateTime.isAfter(sourceDateTime)
        })

    // Update all future events based on the actual source
    for (const futureEvent of futureEvents) {
        try {
            await updateEventFromSource(apiKey, futureEvent.id, actualSourcePage, futureEvent.properties['Date']?.date?.start)
            result.updated++
        } catch (error) {
            console.error(`Error updating event ${futureEvent.id}: ${error}`)
            result.errors.push(`Update ${futureEvent.id}: ${error.message}`)
        }
    }

    // Calculate lookahead period
    const now = moment.utc()
    const lookaheadEndDate = now.clone().add(lookaheadNumber, frequency === 'Weekly' ? 'weeks' : 'days') // TODO: future, actually set Weekly/Monthly/Daily

    // Generate new events
    const newEventStartDates = generateRecurringDates(
        moment.utc(dateTime),
        lookaheadEndDate,
        frequency,
        cadence,
        recurringDays,
        sourceDateTime
    )

    // Get all existing events with the same Recurring ID for checking
    const existingEventsList = allSourcePages
        .filter(p => {
            const pRecurringId = p.properties['Recurring ID']?.rich_text?.[0]?.plain_text
            return pRecurringId === recurringId
        })
        .map(p => ({
            ...p,
            dateTime: moment.utc(p.properties['Date']?.date?.start)
        }))

    // Create new events if they don't already exist
    for (const newEventStartDate of newEventStartDates) {
        try {
            // Check if event already exists at this exact time
            const existsAtTime = existingEventsList.some(e =>
                e.dateTime.format('YYYY-MM-DDTHH:mm') === newEventStartDate.format('YYYY-MM-DDTHH:mm')
            )

            if (existsAtTime) {
                result.skipped++
                continue
            }

            await createEventFromSource(apiKey, dataSourceId, actualSourcePage, newEventStartDate.toISOString())
            result.created++
        } catch (error) {
            console.error(`Error creating event for ${newEventStartDate.format()}: ${error}`)
            result.errors.push(`Create ${newEventStartDate.format()}: ${error.message}`)
        }
    }

    // Mark "Recurring Source" as false on the source page
    try {
        await notionUpdatePage(apiKey, sourcePage.id, {
            'Recurring Source': {
                checkbox: false
            }
        })
    } catch (error) {
        console.error(`Error clearing Recurring Source flag for page ${sourcePage.id}: ${error}`)
    }
}

function generateRecurringDates(startDate, endDate, frequency, cadence, recurringDays, sourceDateTime) {
    const dates = []
    const current = startDate.clone().add(1, 'day')
    const sourceTime = moment.utc(sourceDateTime)

    while (current.isSameOrBefore(endDate)) {
        const dayName = current.format('dddd')

        if (recurringDays.includes(dayName)) {
            // Set the time from source
            const eventDate = current.clone()
            eventDate.hours(sourceTime.hours())
            eventDate.minutes(sourceTime.minutes())
            eventDate.seconds(0)
            eventDate.milliseconds(0)

            dates.push(eventDate)
        }

        current.add(1, 'day')
    }

    return dates
}

async function createEventFromSource(apiKey, dataSourceId, sourcePage, newStartDateTime) {
    const sourceProps = sourcePage.properties
    const newProperties = {}

    // Copy all properties from source
    for (const [key, value] of Object.entries(sourceProps)) {
        if (key === 'Date') {
            // Calculate end datetime based on source duration
            let newEndDateTime = null
            const sourceStart = sourceProps['Date']?.date?.start
            const sourceEnd = sourceProps['Date']?.date?.end
            if (sourceStart && sourceEnd) {
                const durationMs = moment.utc(sourceEnd).diff(moment.utc(sourceStart))
                newEndDateTime = moment.utc(newStartDateTime).add(durationMs, 'milliseconds').toISOString()
            }
            newProperties[key] = {
                date: {
                    start: newStartDateTime,
                    ...(newEndDateTime && { end: newEndDateTime })
                }
            }
        } else if (key === 'Recurring Source') {
            newProperties[key] = {
                checkbox: false
            }
        } else if (value.type === 'title') {
            newProperties[key] = {
                title: value.title
            }
        } else if (value.type === 'rich_text') {
            newProperties[key] = {
                rich_text: value.rich_text
            }
        } else if (value.type === 'number') {
            newProperties[key] = {
                number: value.number
            }
        } else if (value.type === 'select') {
            newProperties[key] = {
                select: value.select
            }
        } else if (value.type === 'multi_select') {
            newProperties[key] = {
                multi_select: value.multi_select
            }
        } else if (value.type === 'checkbox') {
            newProperties[key] = {
                checkbox: value.checkbox
            }
        } else if (value.type === 'date') {
            newProperties[key] = {
                date: value.date
            }
        } else if (value.type === 'url') {
            newProperties[key] = {
                url: value.url
            }
        }
    }

    await notionCreatePage(apiKey, dataSourceId, newProperties)
}

async function updateEventFromSource(apiKey, targetPageId, sourcePage, targetStartDateTime) {
    const sourceProps = sourcePage.properties
    const updateProperties = {}

    // Copy all properties from source except Recurring Source
    for (const [key, value] of Object.entries(sourceProps)) {
        if (key === 'Recurring Source') {
            continue
        }

        if (key === 'Date') {
            // Calculate end datetime based on source duration
            let targetEndDateTime = null
            const sourceStart = sourceProps['Date']?.date?.start
            const sourceEnd = sourceProps['Date']?.date?.end
            if (sourceStart && sourceEnd) {
                const durationMs = moment.utc(sourceEnd).diff(moment.utc(sourceStart))
                targetEndDateTime = moment.utc(targetStartDateTime).add(durationMs, 'milliseconds').toISOString()
            }
            updateProperties[key] = {
                date: {
                    start: targetStartDateTime,
                    ...(targetEndDateTime && { end: targetEndDateTime })
                }
            }
            continue
        }

        if (value.type === 'title') {
            updateProperties[key] = {
                title: value.title
            }
        } else if (value.type === 'rich_text') {
            updateProperties[key] = {
                rich_text: value.rich_text
            }
        } else if (value.type === 'number') {
            updateProperties[key] = {
                number: value.number
            }
        } else if (value.type === 'select') {
            updateProperties[key] = {
                select: value.select
            }
        } else if (value.type === 'multi_select') {
            updateProperties[key] = {
                multi_select: value.multi_select
            }
        } else if (value.type === 'checkbox') {
            updateProperties[key] = {
                checkbox: value.checkbox
            }
        } else if (value.type === 'url') {
            updateProperties[key] = {
                url: value.url
            }
        }
    }

    // Keep the target's Recurring Source value as false
    updateProperties['Recurring Source'] = {
        checkbox: false
    }

    await notionUpdatePage(apiKey, targetPageId, updateProperties)
}

/* #endregion */

module.exports = router