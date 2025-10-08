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
var { randomUUID } = require('crypto');
var notionApi = require('../../services/notionapiservice')
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

/* #region  Recurring Event Processing */

async function ensureRecurringProperties(apiKey, dataSourceId) {
    const dataSource = await notionApi.getDataSource(apiKey, dataSourceId)
    const existingProperties = dataSource.properties || {}

    const requiredProperties = {
        'Recurring Frequency': {
            select: {
                options: [
                    { name: 'Daily', color: 'blue' },
                    { name: 'Weekly', color: 'green' }
                ]
            }
        },
        'Recurring Cadence': {
            number: {
                format: 'number'
            }
        },
        'Recurring Days': {
            multi_select: {
                options: [
                    { name: 'Monday', color: 'blue' },
                    { name: 'Tuesday', color: 'green' },
                    { name: 'Wednesday', color: 'yellow' },
                    { name: 'Thursday', color: 'orange' },
                    { name: 'Friday', color: 'red' },
                    { name: 'Saturday', color: 'purple' },
                    { name: 'Sunday', color: 'pink' }
                ]
            }
        },
        'Recurring Lookahead Number': {
            number: {
                format: 'number'
            }
        },
        'Recurring Source': {
            checkbox: {}
        },
        'Recurring ID': {
            rich_text: {}
        }
    }

    const propertiesToCreate = {}
    let hasNewProperties = false

    for (const [propName, propConfig] of Object.entries(requiredProperties)) {
        if (!existingProperties[propName]) {
            propertiesToCreate[propName] = propConfig
            hasNewProperties = true
            console.log(`Will create missing property: ${propName}`)
        }
    }

    if (hasNewProperties) {
        console.log('Creating missing Recurring properties in data source...')
        await notionApi.updateDataSource(apiKey, dataSourceId, propertiesToCreate)
        console.log('Successfully created missing properties')
    } else {
        console.log('All required Recurring properties already exist')
    }
}

async function processRecurringEvents(apiKey, databaseId, lastSyncedDate) {
    const result = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: []
    }

    try {
        // Get the database to retrieve the data source ID
        const database = await notionApi.getDatabase(apiKey, databaseId)
        const dataSourceId = database.data_sources[0]?.id || database.id

        // Ensure all required properties exist in the data source
        await ensureRecurringProperties(apiKey, dataSourceId)

        // Fetch all pages within date range: from lastSyncedDate (or 14 days before today if not set) to 60 days from today
        const today = moment.utc()
        const startDate = lastSyncedDate
            ? moment.utc(lastSyncedDate).toISOString()
            : today.clone().subtract(14, 'days').startOf('day').toISOString()
        const endDate = today.clone().add(60, 'days').endOf('day').toISOString()

        const data = await notionApi.queryDataSource(apiKey, dataSourceId, {
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
        }, [
            {
                "property": "Date",
                "direction": "ascending"
            }
        ])

        const allSourcePages = data.results
        console.log(`Fetched ${allSourcePages.length} pages from data source between ${startDate} and ${endDate}`)

        for (const sourcePage of allSourcePages) {
            try {
                console.log(`Processing source page ${sourcePage.id}...`)
                await processSourcePage(apiKey, dataSourceId, allSourcePages, sourcePage, result)
            } catch (error) {
                console.error(`Error processing source page ${sourcePage.id}: ${error}`)
                result.errors.push(`Page ${sourcePage.id}: ${error.message}`)
            }
        }

    } catch (error) {
        const errorMessage = error.response.data.message || error.message || 'Unknown error'
        console.error(`Error in processRecurringEvents: ${errorMessage}`)
        result.errors.push(errorMessage)
    }

    return result
}

async function processSourcePage(apiKey, dataSourceId, allSourcePages, sourcePage, result) {
    const props = sourcePage.properties
    const frequency = props['Recurring Frequency']?.select?.name
    let cadence = props['Recurring Cadence']?.number || 1
    const recurringDays = props['Recurring Days']?.multi_select?.map(d => d.name) || []
    let lookaheadNumber = props['Recurring Lookahead Number']?.number || 0
    const sourcePageDateTime = props['Date']?.date?.start
    let recurringId = props['Recurring ID']?.rich_text?.[0]?.plain_text
    const isRecurringSource = props['Recurring Source']?.checkbox === true

    // Validate
    if (!frequency || !sourcePageDateTime || cadence < 1 || lookaheadNumber < 1) {
        result.skipped++
        return
    }

    // For Weekly frequency, recurringDays is required
    if (frequency === 'Weekly' && recurringDays.length === 0) {
        result.skipped++
        return
    }

    // Skip if "Recurring Source" is not true
    if (!isRecurringSource) {
        result.skipped++
        return
    }

    // Apply upper limit to cadence and lookaheadNumber
    if (frequency === 'Weekly') {
        cadence = Math.min(cadence, 4)
        lookaheadNumber = Math.min(lookaheadNumber, 8)
    } else if (frequency === 'Daily') {
        cadence = Math.min(cadence, 30)
        lookaheadNumber = Math.min(lookaheadNumber, 60)
    }
    console.log(`Cadence: ${cadence}, lookahead: ${lookaheadNumber}`)

    // Ensure Recurring ID exists
    if (!recurringId) {
        recurringId = randomUUID()
        // Update the source page with the new UUID
        await notionApi.updatePage(apiKey, sourcePage.id, {
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
    const sourcePageDateTimeMoment = moment.utc(sourcePageDateTime)
    const futureEvents = allSourcePages
        .filter(p => {
            if (p.id === sourcePage.id) { return false }
            const pRecurringId = p.properties['Recurring ID']?.rich_text?.[0]?.plain_text
            if (pRecurringId !== recurringId) { return false }
            const pDateTime = moment.utc(p.properties['Date']?.date?.start)
            return pDateTime.isAfter(sourcePageDateTimeMoment)
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
    let lookaheadEndDate
    if (frequency === 'Weekly') {
        lookaheadEndDate = now.clone().add(lookaheadNumber, 'weeks')
    } else if (frequency === 'Daily') {
        lookaheadEndDate = now.clone().add(lookaheadNumber, 'days')
    } else {
        // Unsupported frequency, skip event generation
        return
    }

    // Generate new events
    const newEventStartDates = generateRecurringDates(
        sourcePageDateTimeMoment,
        lookaheadEndDate,
        frequency,
        cadence,
        recurringDays
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
        await notionApi.updatePage(apiKey, sourcePage.id, {
            'Recurring Source': {
                checkbox: false
            }
        })
    } catch (error) {
        console.error(`Error clearing Recurring Source flag for page ${sourcePage.id}: ${error}`)
    }
}

function generateRecurringDates(startDate, endDate, frequency, cadence, recurringDays) {
    const dates = []
    const sourceHour = startDate.hours()
    const sourceMinute = startDate.minutes()

    if (frequency === 'Daily') {
        // For Daily frequency, use cadence to determine interval
        const current = startDate.clone().add(cadence, 'days')

        while (current.isSameOrBefore(endDate)) {
            // Set the time from source
            const eventDate = current.clone()
            eventDate.hours(sourceHour)
            eventDate.minutes(sourceMinute)
            eventDate.seconds(0)
            eventDate.milliseconds(0)

            dates.push(eventDate)
            current.add(cadence, 'days')
        }
    } else if (frequency === 'Weekly') {
        // For Weekly frequency, use cadence to skip weeks
        const current = startDate.clone().add(1, 'day')
        let weeksSinceStart = 0

        while (current.isSameOrBefore(endDate)) {
            // Calculate how many weeks have passed since the start date
            weeksSinceStart = Math.floor(current.diff(startDate, 'weeks', true))

            // Only process days that fall on a cadence week (e.g., every 2nd week if cadence is 2)
            if (weeksSinceStart > 0 && weeksSinceStart % cadence === 0) {
                const dayName = current.format('dddd')

                if (recurringDays.includes(dayName)) {
                    // Set the time from source
                    const eventDate = current.clone()
                    eventDate.hours(sourceHour)
                    eventDate.minutes(sourceMinute)
                    eventDate.seconds(0)
                    eventDate.milliseconds(0)

                    dates.push(eventDate)
                }
            }

            current.add(1, 'day')
        }
    } else {
        // For other frequencies, use recurringDays without cadence
        const current = startDate.clone().add(1, 'day')

        while (current.isSameOrBefore(endDate)) {
            const dayName = current.format('dddd')

            if (recurringDays.includes(dayName)) {
                // Set the time from source
                const eventDate = current.clone()
                eventDate.hours(sourceHour)
                eventDate.minutes(sourceMinute)
                eventDate.seconds(0)
                eventDate.milliseconds(0)

                dates.push(eventDate)
            }

            current.add(1, 'day')
        }
    }

    return dates
}

function prepareBlocksForCopying(blocks) {
    if (!blocks || blocks.length === 0) {
        return []
    }

    return blocks.map(block => {
        // Strip out read-only fields that Notion API doesn't accept when creating blocks
        const { id, created_time, last_edited_time, created_by, last_edited_by, has_children, archived, ...cleanBlock } = block

        // If the block has children, recursively process them
        if (block[block.type]?.children) {
            cleanBlock[block.type].children = prepareBlocksForCopying(block[block.type].children)
        }

        return cleanBlock
    })
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
        } else if (value.type === 'relation') {
            newProperties[key] = {
                relation: value.relation
            }
        }
    }

    // Get the full source page to retrieve icon
    const fullSourcePage = await notionApi.getPage(apiKey, sourcePage.id)
    const sourceIcon = fullSourcePage.icon

    // Get the source page's content blocks
    const sourceBlocks = await notionApi.getPageBlocks(apiKey, sourcePage.id)
    const sourceChildren = prepareBlocksForCopying(sourceBlocks.results)

    await notionApi.createPage(apiKey, dataSourceId, newProperties, sourceIcon, sourceChildren)
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
        } else if (value.type === 'relation') {
            updateProperties[key] = {
                relation: value.relation
            }
        }
    }

    // Keep the target's Recurring Source value as false
    updateProperties['Recurring Source'] = {
        checkbox: false
    }

    // Get the full source page to retrieve icon
    const fullSourcePage = await notionApi.getPage(apiKey, sourcePage.id)
    const sourceIcon = fullSourcePage.icon

    // Update the page with properties and icon
    await notionApi.updatePage(apiKey, targetPageId, updateProperties, sourceIcon)

    // Get the source page's content blocks and replace target's content
    const sourceBlocks = await notionApi.getPageBlocks(apiKey, sourcePage.id)
    const sourceChildren = prepareBlocksForCopying(sourceBlocks.results)
    await notionApi.replacePageBlocks(apiKey, targetPageId, sourceChildren)
}

/* #endregion */

module.exports = router