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

/* #region  PUT /recurring-events/{id}/sync */
router.put('/:id/sync', async function (req, res) {
    try {
        let id = req.params['id']
        let config = await NotionRecurringModel.findById(new mongoose.Types.ObjectId(id))
        if (!config) {
            throw `Recurring events config not found with id ${id}`
        }

        const result = await processRecurringEvents(config.secretKey, config.databaseId)

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

async function notionFetchPages(apiKey, databaseId, filter = null) {
    const options = {
        method: 'POST',
        url: `https://api.notion.com/v1/databases/${databaseId}/query`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Notion-Version': '2022-02-22',
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
            'Notion-Version': '2022-02-22'
        }
    }

    let res = await axios(options)
    return res.data
}

async function notionCreatePage(apiKey, databaseId, properties) {
    const options = {
        method: 'POST',
        url: `https://api.notion.com/v1/pages`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Notion-Version': '2022-02-22',
            'Content-Type': 'application/json'
        },
        data: {
            parent: { database_id: databaseId },
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
            'Notion-Version': '2022-02-22',
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

async function processRecurringEvents(apiKey, databaseId) {
    const result = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: []
    }

    try {
        // Fetch all pages within date range: 7 days before today to 14 days from today
        const today = moment.utc()
        const startDate = today.clone().subtract(7, 'days').startOf('day').toISOString()
        const endDate = today.clone().add(14, 'days').endOf('day').toISOString()

        const data = await notionFetchPages(apiKey, databaseId, {
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

        const sourcePages = data.results

        for (const sourcePage of sourcePages) {
            try {
                await processSourcePage(apiKey, databaseId, sourcePage, result)
            } catch (error) {
                console.error(`Error processing source page ${sourcePage.id}: ${error}`)
                result.errors.push(`Page ${sourcePage.id}: ${error.message}`)
            }
        }

    } catch (error) {
        console.error(`Error in processRecurringEvents: ${error}`)
        result.errors.push(error.message)
    }

    return result
}

async function processSourcePage(apiKey, databaseId, sourcePage, result) {
    const props = sourcePage.properties
    const frequency = props['Recurring Frequency'].select.name
    const cadence = props['Recurring Cadence']?.number || 1
    const recurringDays = props['Recurring Days']?.multi_select?.map(d => d.name) || []
    const lookaheadNumber = props['Recurring Lookahead Number']?.number || 0
    const dateTime = props['Date']?.date?.start
    let recurringId = props['Recurring ID']?.rich_text?.[0]?.plain_text

    // Validate
    if (!frequency || !dateTime || cadence < 0 || recurringDays.length === 0 || lookaheadNumber < 1) {
        result.skipped++
        return
    }

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

    // Get all existing events with same Recurring ID
    const existingEvents = await notionFetchPages(apiKey, databaseId, {
        property: "Recurring ID",
        rich_text: {
            equals: recurringId
        }
    })

    const existingEventsList = existingEvents.results
        .filter(e => e.id !== sourcePage.id)
        .map(e => ({
            id: e.id,
            dateTime: moment.utc(e.properties['Date']?.date?.start),
            isSource: e.properties['Recurring Source']?.checkbox === true,
            properties: e.properties
        }))
        .sort((a, b) => a.dateTime - b.dateTime)

    // Update all future events if this is a source
    const sourceDateTime = moment.utc(dateTime)
    const futureEvents = existingEventsList.filter(e => e.dateTime.isSameOrAfter(sourceDateTime))

    for (const futureEvent of futureEvents) {
        try {
            await updateEventFromSource(apiKey, futureEvent.id, sourcePage, futureEvent.properties['Date']?.date?.start)
            result.updated++
        } catch (error) {
            console.error(`Error updating event ${futureEvent.id}: ${error}`)
            result.errors.push(`Update ${futureEvent.id}: ${error.message}`)
        }
    }

    // Calculate lookahead period
    const now = moment.utc()
    const lookaheadEndDate = now.clone().add(lookaheadNumber, frequency === 'Weekly' ? 'weeks' : 'days')

    // Find the last event date
    const lastEventDate = existingEventsList.length > 0
        ? existingEventsList[existingEventsList.length - 1].dateTime
        : sourceDateTime

    // Generate new events
    const newEvents = generateRecurringDates(
        lastEventDate.clone().add(1, 'day'),
        lookaheadEndDate,
        frequency,
        cadence,
        recurringDays,
        sourceDateTime
    )

    // Create new events
    for (const newEventDate of newEvents) {
        try {
            // Check if event already exists at this exact time
            const existsAtTime = existingEventsList.some(e =>
                e.dateTime.format('YYYY-MM-DDTHH:mm') === newEventDate.format('YYYY-MM-DDTHH:mm')
            )

            if (existsAtTime) {
                result.skipped++
                continue
            }

            await createEventFromSource(apiKey, databaseId, sourcePage, newEventDate.toISOString())
            result.created++
        } catch (error) {
            console.error(`Error creating event for ${newEventDate.format()}: ${error}`)
            result.errors.push(`Create ${newEventDate.format()}: ${error.message}`)
        }
    }
}

function generateRecurringDates(startDate, endDate, frequency, cadence, recurringDays, sourceDateTime) {
    const dates = []
    const current = startDate.clone()
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

async function createEventFromSource(apiKey, databaseId, sourcePage, newDateTime) {
    const sourceProps = sourcePage.properties
    const newProperties = {}

    // Copy all properties from source
    for (const [key, value] of Object.entries(sourceProps)) {
        if (key === 'Date') {
            newProperties[key] = {
                date: {
                    start: newDateTime
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

    await notionCreatePage(apiKey, databaseId, newProperties)
}

async function updateEventFromSource(apiKey, targetPageId, sourcePage, targetDateTime) {
    const sourceProps = sourcePage.properties
    const updateProperties = {}

    // Copy all properties from source except DateTime and Recurring Source
    for (const [key, value] of Object.entries(sourceProps)) {
        if (key === 'Date' || key === 'Recurring Source') {
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