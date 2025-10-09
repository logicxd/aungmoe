"use strict";

var moment = require('moment')
var { randomUUID } = require('crypto')
var notionApi = require('../../../services/notionapiservice')

/* #region Constants */

const MAX_LOOKBACK_DAYS = 14
const MAX_LOOKAHEAD_DAYS = 60
const MAX_WEEKLY_CADENCE = 4
const MAX_WEEKLY_LOOKAHEAD = 8
const MAX_DAILY_CADENCE = 30
const MAX_DAILY_LOOKAHEAD = 60

/* #endregion */

/* #region RecurringEventsService */

class RecurringEventsService {
    constructor(apiKey, databaseId, notionApiService = notionApi, logger = console) {
        this.apiKey = apiKey
        this.databaseId = databaseId
        this.notionApi = notionApiService
        this.logger = logger
        this.dataSourceId = null
        this.allEvents = []
    }

    /* #region Main Processing */

    async processRecurringEvents(lastSyncedDate) {
        const result = this._createProcessingResult()

        try {
            this.dataSourceId = await this.getDataSourceId()
            await this.ensureRecurringProperties()

            const allSourcePages = await this.fetchSourcePages(lastSyncedDate)
            await this.processAllSourcePages(allSourcePages, result)

            this.logger.log(`Recurring events processing completed.`)
        } catch (error) {
            this._handleProcessingError(error, result)
        }

        return result
    }

    async getDataSourceId() {
        const database = await this.notionApi.getDatabase(this.apiKey, this.databaseId)

        if (!database.data_sources || database.data_sources.length === 0) {
            throw new Error(`Database ${this.databaseId} has no data sources. Cannot proceed with recurring events processing.`)
        }

        return database.data_sources[0].id
    }

    async fetchSourcePages(lastSyncedDate) {
        const today = moment.utc()
        const startDate = today.clone().subtract(MAX_LOOKBACK_DAYS, 'days').startOf('day').toISOString()
        const endDate = today.clone().add(MAX_LOOKAHEAD_DAYS, 'days').endOf('day').toISOString()

        const data = await this.notionApi.queryDataSource(this.apiKey, this.dataSourceId, {
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

        this.logger.log(`Fetched ${data.results.length} page(s) from data source between ${startDate} and ${endDate}`)
        return data.results
    }

    async processAllSourcePages(allSourcePages, result) {
        this.allEvents = allSourcePages.map(page => new Event(page))

        for (const event of this.allEvents) {
            try {
                this.logger.log(`Processing source page "${event.name}" ...`)
                await this.processSourcePage(event, result)
            } catch (error) {
                this.logger.error(`Error processing source page "${event.notionPageId}": ${error}`)
                result.errors.push(`Page ${event.notionPageId}: ${error.message}`)
            }
        }
    }

    /* #endregion */

    /* #region Setup and Initialization */

    async ensureRecurringProperties() {
        const dataSource = await this.notionApi.getDataSource(this.apiKey, this.dataSourceId)
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
                this.logger.log(`Will create missing property: ${propName}`)
            }
        }

        if (hasNewProperties) {
            this.logger.log('Creating missing Recurring properties in data source...')
            await this.notionApi.updateDataSource(this.apiKey, this.dataSourceId, propertiesToCreate)
            this.logger.log('Successfully created missing properties')
        } else {
            this.logger.log('All required Recurring properties already exist')
        }
    }

    /* #endregion */

    /* #region Source Page Processing */

    async processSourcePage(event, result) {
        if (!this._validateRecurringEvent(event, result)) {
            return
        }

        await this.stampRecurringId(event)

        const futureEvents = this.findFutureEvents(event)
        await this.updateAllFutureEvents(futureEvents, event, result)

        await this.generateFutureEvents(event, result)

        await this.markEventAsProcessed(event, result)
    }

    async stampRecurringId(event) {
        if (!event.recurringId) {
            event.recurringId = randomUUID()
            await this.notionApi.updatePage(this.apiKey, event.notionPageId, {
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
            this.logger.log(`Generated new Recurring ID for page ${event.notionPageId}: ${event.recurringId}`)
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
                this.logger.error(`Error updating event ${futureEvent.notionPageId}: ${error}`)
                result.errors.push(`Update ${futureEvent.notionPageId}: ${error.message}`)
            }
        }
    }

    async generateFutureEvents(event, result) {
        const lookaheadEndDate = this._calculateLookaheadEndDate(event)
        if (!lookaheadEndDate) {
            this.logger.log(`Unsupported frequency: ${event.frequency}, skipping event generation`)
            return
        }

        const newEventStartDates = this._generateNewEventDates(event, lookaheadEndDate)
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
                this.logger.log(`Created new event on ${newEventStartDate.format()} from source ${sourceEvent.name}`)
                result.created++
            } catch (error) {
                this.logger.error(`Error creating event for ${newEventStartDate.format()}: ${error}`)
                result.errors.push(`Create ${newEventStartDate.format()}: ${error.message}`)
            }
        }
    }

    async markEventAsProcessed(event, result) {
        try {
            await this.notionApi.updatePage(this.apiKey, event.notionPageId, {
                'Recurring Source': {
                    checkbox: false
                }
            })
        } catch (error) {
            this.logger.error(`Error clearing Recurring Source flag for page ${event.notionPageId}: ${error}`)
            result.errors.push(`Mark processed ${event.notionPageId}: ${error.message}`)
        }
    }

    /* #endregion */

    /* #region Event Creation and Update */

    async createEventFromSource(sourcePage, newStartDateTime) {
        const newProperties = this._copyPropertiesFromSource(sourcePage.properties, newStartDateTime)
        const sourceIcon = await this._getSourceIcon(sourcePage.id)
        const sourceChildren = await this._getSourceBlocks(sourcePage.id)

        await this.notionApi.createPage(this.apiKey, this.dataSourceId, newProperties, sourceIcon, sourceChildren)
    }

    async updateEventFromSource(targetPageId, sourcePage, targetStartDateTime) {
        const updateProperties = this._copyPropertiesFromSource(sourcePage.properties, targetStartDateTime)
        const sourceIcon = await this._getSourceIcon(sourcePage.id)
        const sourceChildren = await this._getSourceBlocks(sourcePage.id)

        await this.notionApi.updatePage(this.apiKey, targetPageId, updateProperties, sourceIcon)
        await this.notionApi.replacePageBlocks(this.apiKey, targetPageId, sourceChildren)
    }

    _copyPropertiesFromSource(sourceProps, newStartDateTime) {
        const properties = {}

        for (const [key, value] of Object.entries(sourceProps)) {
            if (key === 'Date') {
                properties[key] = this._calculateDateProperty(sourceProps, newStartDateTime)
            } else if (key === 'Recurring Source') {
                properties[key] = { checkbox: false }
            } else {
                const copiedProperty = this._copyPropertyByType(value)
                if (copiedProperty) {
                    properties[key] = copiedProperty
                }
            }
        }

        return properties
    }

    _calculateDateProperty(sourceProps, newStartDateTime) {
        let newEndDateTime = null
        const sourceStart = sourceProps['Date']?.date?.start
        const sourceEnd = sourceProps['Date']?.date?.end

        if (sourceStart && sourceEnd) {
            const durationMs = moment.utc(sourceEnd).diff(moment.utc(sourceStart))
            newEndDateTime = moment.utc(newStartDateTime).add(durationMs, 'milliseconds').toISOString()
        }

        return {
            date: {
                start: newStartDateTime,
                ...(newEndDateTime && { end: newEndDateTime })
            }
        }
    }

    _copyPropertyByType(value) {
        const propertyTypeMap = {
            'title': () => ({ title: value.title }),
            'rich_text': () => ({ rich_text: value.rich_text }),
            'number': () => ({ number: value.number }),
            'select': () => ({ select: value.select }),
            'multi_select': () => ({ multi_select: value.multi_select }),
            'checkbox': () => ({ checkbox: value.checkbox }),
            'date': () => ({ date: value.date }),
            'url': () => ({ url: value.url }),
            'relation': () => ({ relation: value.relation })
        }

        const copyFunction = propertyTypeMap[value.type]
        return copyFunction ? copyFunction() : null
    }

    async _getSourceIcon(sourcePageId) {
        const fullSourcePage = await this.notionApi.getPage(this.apiKey, sourcePageId)
        return fullSourcePage.icon
    }

    async _getSourceBlocks(sourcePageId) {
        const sourceBlocks = await this.notionApi.getPageBlocks(this.apiKey, sourcePageId)
        return this._prepareBlocksForCopying(sourceBlocks.results)
    }

    /* #endregion */

    /* #region Result Tracking and Validation */

    _createProcessingResult() {
        return {
            created: 0,
            updated: 0,
            skipped: 0,
            errors: []
        }
    }

    _handleProcessingError(error, result) {
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error'
        this.logger.error(`Error in processRecurringEvents: ${errorMessage}`)
        result.errors.push(errorMessage)
    }

    _validateRecurringEvent(event, result) {
        if (!event.isValid()) {
            const reason = event.getValidationFailureReason()
            this.logger.log(`Skipping page ${event.name}: ${reason}`)
            result.skipped++
            return false
        }
        return true
    }

    /* #endregion */

    /* #region Date Calculation and Generation Strategy */

    _calculateLookaheadEndDate(event) {
        const now = moment.utc()
        if (event.frequency === 'Weekly') {
            return now.clone().add(event.lookaheadNumber, 'weeks')
        } else if (event.frequency === 'Daily') {
            return now.clone().add(event.lookaheadNumber, 'days')
        }
        return null
    }

    _generateNewEventDates(event, lookaheadEndDate) {
        const strategy = this._getDateGenerationStrategy(event.frequency)
        return strategy.generate(event, lookaheadEndDate)
    }

    _getDateGenerationStrategy(frequency) {
        const strategies = {
            'Daily': this._dailyDateStrategy,
            'Weekly': this._weeklyDateStrategy
        }
        return strategies[frequency]
    }

    _dailyDateStrategy = {
        generate: (event, lookaheadEndDate) => {
            const dates = []
            const current = event.dateTimeMoment.clone().add(1, 'day')
            let daysSinceStart = 0

            while (current.isSameOrBefore(lookaheadEndDate)) {
                daysSinceStart = Math.floor(current.diff(event.dateTimeMoment, 'days', true))

                if (this._shouldGenerateDailyEvent(daysSinceStart, event.cadence)) {
                    dates.push(this._createEventDateWithTime(current, event.dateTimeMoment))
                }

                current.add(1, 'day')
            }

            return dates
        }
    }

    _shouldGenerateDailyEvent(daysSinceStart, cadence) {
        return daysSinceStart > 0 && daysSinceStart % cadence === 0
    }

    _weeklyDateStrategy = {
        generate: (event, lookaheadEndDate) => {
            const dates = []
            const current = event.dateTimeMoment.clone().add(1, 'day')
            let weeksSinceStart = 0

            while (current.isSameOrBefore(lookaheadEndDate)) {
                weeksSinceStart = Math.floor(current.diff(event.dateTimeMoment, 'weeks', true))

                if (this._shouldGenerateWeeklyEvent(weeksSinceStart, event.cadence, current, event.recurringDays)) {
                    dates.push(this._createEventDateWithTime(current, event.dateTimeMoment))
                }

                current.add(1, 'day')
            }

            return dates
        }
    }

    _shouldGenerateWeeklyEvent(weeksSinceStart, cadence, current, recurringDays) {
        if (weeksSinceStart < 0 || weeksSinceStart % cadence !== 0) {
            return false
        }

        const dayName = current.format('dddd')
        return recurringDays.includes(dayName)
    }

    _createEventDateWithTime(current, sourceDateTime) {
        const eventDate = current.clone()
        eventDate.hours(sourceDateTime.hours())
        eventDate.minutes(sourceDateTime.minutes())
        eventDate.seconds(0)
        eventDate.milliseconds(0)
        return eventDate
    }

    /* #endregion */

    /* #region Notion Block Preparation */

    _prepareBlocksForCopying(blocks) {
        if (!blocks || blocks.length === 0) {
            return []
        }

        return blocks.map(block => {
            // Strip out read-only fields that Notion API doesn't accept when creating blocks
            const { id, created_time, last_edited_time, created_by, last_edited_by, has_children, archived, ...cleanBlock } = block

            // If the block has children, recursively process them
            if (block[block.type]?.children) {
                cleanBlock[block.type].children = this._prepareBlocksForCopying(block[block.type].children)
            }

            return cleanBlock
        })
    }

    /* #endregion */
}

/* #endregion */

/* #region Event Class */

class Event {
    constructor(sourcePage) {
        const props = sourcePage.properties

        this.notionPage = sourcePage
        this.notionPageId = sourcePage.id
        this.frequency = props['Recurring Frequency']?.select?.name
        this.cadence = props['Recurring Cadence']?.number ?? 0
        this.recurringDays = props['Recurring Days']?.multi_select?.map(d => d.name) || []
        this.lookaheadNumber = props['Recurring Lookahead Number']?.number ?? 0
        this.dateTime = props['Date']?.date?.start
        this.recurringId = props['Recurring ID']?.rich_text?.[0]?.plain_text
        this.isRecurringSource = props['Recurring Source']?.checkbox === true
        this.name = props['Name']?.title?.[0]?.plain_text
        this.dateTimeMoment = this.dateTime ? moment.utc(this.dateTime) : null

        this._applyUpperLimits()
    }

    _applyUpperLimits() {
        if (this.frequency === 'Weekly') {
            this.cadence = Math.min(this.cadence, MAX_WEEKLY_CADENCE)
            this.lookaheadNumber = Math.min(this.lookaheadNumber, MAX_WEEKLY_LOOKAHEAD)
        } else if (this.frequency === 'Daily') {
            this.cadence = Math.min(this.cadence, MAX_DAILY_CADENCE)
            this.lookaheadNumber = Math.min(this.lookaheadNumber, MAX_DAILY_LOOKAHEAD)
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
    RecurringEventsService,
    Event
}
