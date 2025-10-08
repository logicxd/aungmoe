"use strict";

var moment = require('moment')
var { randomUUID } = require('crypto')
var notionApi = require('../../../services/notionapiservice')

/* #region RecurringEventsService */

class RecurringEventsService {
    constructor(apiKey, databaseId) {
        this.apiKey = apiKey
        this.databaseId = databaseId
        this.dataSourceId = null
        this.allEvents = []
    }

    /* #region Main Processing */

    async processRecurringEvents(lastSyncedDate) {
        const result = createProcessingResult()

        try {
            this.dataSourceId = await this.getDataSourceId()
            await this.ensureRecurringProperties()

            const allSourcePages = await this.fetchSourcePages(lastSyncedDate)
            await this.processAllSourcePages(allSourcePages, result)

            console.log(`Recurring events processing completed.`)
        } catch (error) {
            handleProcessingError(error, result)
        }

        return result
    }

    async getDataSourceId() {
        const database = await notionApi.getDatabase(this.apiKey, this.databaseId)
        return database.data_sources[0]?.id || database.id
    }

    async fetchSourcePages(lastSyncedDate) {
        const today = moment.utc()
        const startDate = lastSyncedDate
            ? moment.utc(lastSyncedDate).toISOString()
            : today.clone().subtract(14, 'days').startOf('day').toISOString()
        const endDate = today.clone().add(60, 'days').endOf('day').toISOString()

        const data = await notionApi.queryDataSource(this.apiKey, this.dataSourceId, {
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

        console.log(`Fetched ${data.results.length} page(s) from data source between ${startDate} and ${endDate}`)
        return data.results
    }

    async processAllSourcePages(allSourcePages, result) {
        this.allEvents = allSourcePages.map(page => new Event(page))

        for (const event of this.allEvents) {
            try {
                console.log(`Processing source page "${event.name}" ...`)
                await this.processSourcePage(event, result)
            } catch (error) {
                console.error(`Error processing source page "${event.notionPageId}": ${error}`)
                result.errors.push(`Page ${event.notionPageId}: ${error.message}`)
            }
        }
    }

    /* #endregion */

    /* #region Setup and Initialization */

    async ensureRecurringProperties() {
        const dataSource = await notionApi.getDataSource(this.apiKey, this.dataSourceId)
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
            await notionApi.updateDataSource(this.apiKey, this.dataSourceId, propertiesToCreate)
            console.log('Successfully created missing properties')
        } else {
            console.log('All required Recurring properties already exist')
        }
    }

    /* #endregion */

    /* #region Source Page Processing */

    async processSourcePage(event, result) {
        if (!validateRecurringEvent(event, result)) {
            return
        }

        await this.stampRecurringId(event)

        const futureEvents = this.findFutureEvents(event)
        await this.updateAllFutureEvents(futureEvents, event, result)

        await this.generateFutureEvents(event, result)

        await this.markEventAsProcessed(event)
    }

    async stampRecurringId(event) {
        if (!event.recurringId) {
            event.recurringId = randomUUID()
            await notionApi.updatePage(this.apiKey, event.notionPageId, {
                'Recurring ID': {
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: event.recurringId
                            }
                        }
                    ]
                }
            })
            console.log(`Generated new Recurring ID for page ${event.notionPageId}: ${event.recurringId}`)
        }
    }

    findFutureEvents(sourceEvent) {
        return this.allEvents.filter(event => {
            if (event.notionPageId === sourceEvent.notionPageId) { return false }
            if (event.recurringId !== sourceEvent.recurringId) { return false }
            return event.dateTimeMoment && event.dateTimeMoment.isAfter(sourceEvent.dateTimeMoment)
        })
    }

    async updateAllFutureEvents(futureEvents, sourceEvent, result) {
        for (const futureEvent of futureEvents) {
            try {
                await this.updateEventFromSource(futureEvent.notionPageId, sourceEvent.notionPage, futureEvent.dateTime)
                result.updated++
            } catch (error) {
                console.error(`Error updating event ${futureEvent.notionPageId}: ${error}`)
                result.errors.push(`Update ${futureEvent.notionPageId}: ${error.message}`)
            }
        }
    }

    async generateFutureEvents(event, result) {
        const lookaheadEndDate = calculateLookaheadEndDate(event)
        if (!lookaheadEndDate) {
            console.log(`Unsupported frequency: ${event.frequency}, skipping event generation`)
            return
        }

        const newEventStartDates = generateNewEventDates(event, lookaheadEndDate)
        await this.createNewEvents(event, newEventStartDates, result)
    }

    async createNewEvents(sourceEvent, newEventStartDates, result) {
        const existingEvents = this.allEvents.filter(e => e.recurringId === sourceEvent.recurringId)

        for (const newEventStartDate of newEventStartDates) {
            try {
                const existsAtTime = existingEvents.some(e =>
                    e.dateTimeMoment && e.dateTimeMoment.format('YYYY-MM-DDTHH:mm') === newEventStartDate.format('YYYY-MM-DDTHH:mm')
                )

                if (existsAtTime) {
                    result.skipped++
                    continue
                }

                await this.createEventFromSource(sourceEvent.notionPage, newEventStartDate.toISOString())
                console.log(`Created new event on ${newEventStartDate.format()} from source ${sourceEvent.Name}`)
                result.created++
            } catch (error) {
                console.error(`Error creating event for ${newEventStartDate.format()}: ${error}`)
                result.errors.push(`Create ${newEventStartDate.format()}: ${error.message}`)
            }
        }
    }

    async markEventAsProcessed(event) {
        try {
            await notionApi.updatePage(this.apiKey, event.notionPageId, {
                'Recurring Source': {
                    checkbox: false
                }
            })
        } catch (error) {
            console.error(`Error clearing Recurring Source flag for page ${event.notionPageId}: ${error}`)
        }
    }

    /* #endregion */

    /* #region Event Creation and Update */

    async createEventFromSource(sourcePage, newStartDateTime) {
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
        const fullSourcePage = await notionApi.getPage(this.apiKey, sourcePage.id)
        const sourceIcon = fullSourcePage.icon

        // Get the source page's content blocks
        const sourceBlocks = await notionApi.getPageBlocks(this.apiKey, sourcePage.id)
        const sourceChildren = prepareBlocksForCopying(sourceBlocks.results)

        await notionApi.createPage(this.apiKey, this.dataSourceId, newProperties, sourceIcon, sourceChildren)
    }

    async updateEventFromSource(targetPageId, sourcePage, targetStartDateTime) {
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
        const fullSourcePage = await notionApi.getPage(this.apiKey, sourcePage.id)
        const sourceIcon = fullSourcePage.icon

        // Update the page with properties and icon
        await notionApi.updatePage(this.apiKey, targetPageId, updateProperties, sourceIcon)

        // Get the source page's content blocks and replace target's content
        const sourceBlocks = await notionApi.getPageBlocks(this.apiKey, sourcePage.id)
        const sourceChildren = prepareBlocksForCopying(sourceBlocks.results)
        await notionApi.replacePageBlocks(this.apiKey, targetPageId, sourceChildren)
    }

    /* #endregion */
}

/* #endregion */

/* #region Helper Functions */

function createProcessingResult() {
    return {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: []
    }
}

function handleProcessingError(error, result) {
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error'
    console.error(`Error in processRecurringEvents: ${errorMessage}`)
    result.errors.push(errorMessage)
}

function validateRecurringEvent(event, result) {
    if (!event.isValid()) {
        const reason = event.getValidationFailureReason()
        console.log(`Skipping page ${event.name}: ${reason}`)
        result.skipped++
        return false
    }
    return true
}

/* #endregion */

/* #region Date Generation */

function calculateLookaheadEndDate(event) {
    const now = moment.utc()
    if (event.frequency === 'Weekly') {
        return now.clone().add(event.lookaheadNumber, 'weeks')
    } else if (event.frequency === 'Daily') {
        return now.clone().add(event.lookaheadNumber, 'days')
    }
    return null
}

function generateNewEventDates(event, lookaheadEndDate) {
    const strategy = getDateGenerationStrategy(event.frequency)
    return strategy.generate(event, lookaheadEndDate)
}

function getDateGenerationStrategy(frequency) {
    const strategies = {
        'Daily': dailyDateStrategy,
        'Weekly': weeklyDateStrategy
    }
    return strategies[frequency]
}

const dailyDateStrategy = {
    generate(event, lookaheadEndDate) {
        const dates = []
        const current = event.dateTimeMoment.clone().add(1, 'day')
        let daysSinceStart = 0

        while (current.isSameOrBefore(lookaheadEndDate)) {
            daysSinceStart = Math.floor(current.diff(event.dateTimeMoment, 'days', true))

            if (shouldGenerateDailyEvent(daysSinceStart, event.cadence)) {
                dates.push(createEventDateWithTime(current, event.dateTimeMoment))
            }

            current.add(1, 'day')
        }

        return dates
    }
}

function shouldGenerateDailyEvent(daysSinceStart, cadence) {
    return daysSinceStart > 0 && daysSinceStart % cadence === 0
}

const weeklyDateStrategy = {
    generate(event, lookaheadEndDate) {
        const dates = []
        const current = event.dateTimeMoment.clone().add(1, 'day')
        let weeksSinceStart = 0

        while (current.isSameOrBefore(lookaheadEndDate)) {
            weeksSinceStart = Math.floor(current.diff(event.dateTimeMoment, 'weeks', true))

            if (shouldGenerateWeeklyEvent(weeksSinceStart, event.cadence, current, event.recurringDays)) {
                dates.push(createEventDateWithTime(current, event.dateTimeMoment))
            }

            current.add(1, 'day')
        }

        return dates
    }
}

function shouldGenerateWeeklyEvent(weeksSinceStart, cadence, current, recurringDays) {
    if (weeksSinceStart <= 0 || weeksSinceStart % cadence !== 0) {
        return false
    }

    const dayName = current.format('dddd')
    return recurringDays.includes(dayName)
}

function createEventDateWithTime(current, sourceDateTime) {
    const eventDate = current.clone()
    eventDate.hours(sourceDateTime.hours())
    eventDate.minutes(sourceDateTime.minutes())
    eventDate.seconds(0)
    eventDate.milliseconds(0)
    return eventDate
}

/* #endregion */

/* #region Block Utilities */

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

/* #endregion */

/* #region Event Class */

class Event {
    constructor(sourcePage) {
        const props = sourcePage.properties

        this.notionPage = sourcePage
        this.notionPageId = sourcePage.id
        this.frequency = props['Recurring Frequency']?.select?.name
        this.cadence = props['Recurring Cadence']?.number || 1
        this.recurringDays = props['Recurring Days']?.multi_select?.map(d => d.name) || []
        this.lookaheadNumber = props['Recurring Lookahead Number']?.number || 0
        this.dateTime = props['Date']?.date?.start
        this.recurringId = props['Recurring ID']?.rich_text?.[0]?.plain_text
        this.isRecurringSource = props['Recurring Source']?.checkbox === true
        this.name = props['Name']?.title?.[0]?.plain_text
        this.dateTimeMoment = this.dateTime ? moment.utc(this.dateTime) : null

        this._applyUpperLimits()
    }

    _applyUpperLimits() {
        if (this.frequency === 'Weekly') {
            this.cadence = Math.min(this.cadence, 4)
            this.lookaheadNumber = Math.min(this.lookaheadNumber, 8)
        } else if (this.frequency === 'Daily') {
            this.cadence = Math.min(this.cadence, 30)
            this.lookaheadNumber = Math.min(this.lookaheadNumber, 60)
        }
    }

    isValid() {
        if (!this.frequency || !this.dateTime || this.cadence < 1 || this.lookaheadNumber < 1) {
            return false
        }

        if (this.frequency !== 'Daily' && this.frequency !== 'Weekly') {
            return false
        }

        if (this.frequency === 'Weekly' && this.recurringDays.length === 0) {
            return false
        }

        if (!this.isRecurringSource) {
            return false
        }

        return true
    }

    getValidationFailureReason() {
        if (!this.frequency) return 'Missing frequency'
        if (!this.dateTime) return 'Missing date'
        if (this.cadence < 1) return 'Invalid cadence (< 1)'
        if (this.lookaheadNumber < 1) return 'Invalid lookahead number (< 1)'
        if (this.frequency === 'Weekly' && this.recurringDays.length === 0) {
            return 'Weekly frequency requires recurring days'
        }
        if (!this.isRecurringSource) return 'Not marked as recurring source'
        return 'Unknown'
    }
}

/* #endregion */

module.exports = {
    RecurringEventsService
}
