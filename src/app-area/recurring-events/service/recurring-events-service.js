"use strict";

var moment = require('moment-timezone')
var { randomUUID } = require('crypto')
var notionApi = require('../../../services/notionapiservice')

/* #region Constants */

const MAX_LOOKBACK_DAYS = 30
const MAX_LOOKAHEAD_DAYS = 60
const DEFAULT_TIMEZONE = 'America/Los_Angeles'
const MAX_WEEKLY_CADENCE = 4
const MAX_WEEKLY_LOOKAHEAD = 8
const MAX_DAILY_CADENCE = 30
const MAX_DAILY_LOOKAHEAD = 60
const RECURRING_SYNC_ROLLOUT_DATE = '2026-01-11' // Only process events from this date onwards for automatic sync

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

    async processRecurringEvents() {
        const result = this._createProcessingResult()

        try {
            this.dataSourceId = await this.getDataSourceId()
            await this.ensureRecurringProperties()

            const allSourcePages = await this.fetchSourcePages()
            await this.processAllSourcePages(allSourcePages, result)

            this.logger.log(`Recurring events processing completed.`)
        } catch (error) {
            this._handleProcessingError(error, result)
        }

        return result
    }

    async processRecurringEventsAutomatic() {
        const result = this._createProcessingResult()

        try {
            this.dataSourceId = await this.getDataSourceId()
            await this.ensureRecurringProperties()

            const allSourcePages = await this.fetchSourcePages()
            await this.processAllSourcePagesAutomatic(allSourcePages, result)

            this.logger.log(`Automatic recurring events processing completed.`)
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

    async fetchSourcePages() {
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

        const rolloutDate = moment.tz(RECURRING_SYNC_ROLLOUT_DATE, DEFAULT_TIMEZONE).startOf('day')

        for (const event of this.allEvents) {
            try {
                // Skip events before rollout date
                if (event.dateTimeMoment && event.dateTimeMoment.isBefore(rolloutDate)) {
                    this.logger.log(`Skipping event "${event.name}" (${event.dateTimeMoment.format('YYYY-MM-DD')}): before rollout date ${RECURRING_SYNC_ROLLOUT_DATE}`)
                    result.skipped++
                    continue
                }

                this.logger.log(`Processing source page "${event.name}" ...`)

                if (!this._validateRecurringEvent(event, result)) {
                    continue
                }

                await this.processSourcePage(event, result)
            } catch (error) {
                this.logger.error(`Error processing source page "${event.notionPageId}": ${error}`)
                result.errors.push(`Page ${event.notionPageId}: ${error.message}`)
            }
        }
    }

    async processAllSourcePagesAutomatic(allSourcePages, result) {
        this.allEvents = allSourcePages.map(page => new Event(page))

        const latestEvents = this.findLatestEventPerRecurringId(this.allEvents)

        this.logger.log(`Found ${latestEvents.length} unique recurring event groups`)

        const rolloutDate = moment.tz(RECURRING_SYNC_ROLLOUT_DATE, DEFAULT_TIMEZONE).startOf('day')

        for (const event of latestEvents) {
            try {
                // Skip events before rollout date
                if (event.dateTimeMoment && event.dateTimeMoment.isBefore(rolloutDate)) {
                    this.logger.log(`Skipping event "${event.name}" (${event.dateTimeMoment.format('YYYY-MM-DD')}): before rollout date ${RECURRING_SYNC_ROLLOUT_DATE}`)
                    result.skipped++
                    continue
                }

                this.logger.log(`Processing latest event for Recurring ID "${event.recurringId}": ${event.name}`)

                if (!this._validateRecurringEventForAutoSync(event, result)) {
                    continue
                }

                await this.processSourcePage(event, result)
            } catch (error) {
                this.logger.error(`Error processing event "${event.notionPageId}": ${error}`)
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
            // 'Recurring Timezone': Property no longer needed - timezone is now hardcoded to DEFAULT_TIMEZONE
            // Original property definition preserved for future reference:
            // 'Recurring Timezone': {
            //     select: {
            //         options: [
            //             { name: 'America/New_York', color: 'blue' },
            //             { name: 'America/Chicago', color: 'green' },
            //             { name: 'America/Denver', color: 'yellow' },
            //             { name: 'America/Phoenix', color: 'orange' },
            //             { name: 'America/Los_Angeles', color: 'red' },
            //             { name: 'America/Anchorage', color: 'purple' },
            //             { name: 'Pacific/Honolulu', color: 'pink' }
            //         ]
            //     }
            // }
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

    findLatestEventPerRecurringId(events) {
        const eventsByRecurringId = new Map()

        for (const event of events) {
            if (!event.recurringId) continue

            if (!eventsByRecurringId.has(event.recurringId)) {
                eventsByRecurringId.set(event.recurringId, [])
            }
            eventsByRecurringId.get(event.recurringId).push(event)
        }

        const latestEvents = []
        for (const eventGroup of eventsByRecurringId.values()) {
            const sorted = eventGroup.sort((a, b) =>
                b.dateTimeMoment.valueOf() - a.dateTimeMoment.valueOf()
            )
            latestEvents.push(sorted[0])
        }

        return latestEvents
    }

    async updateAllFutureEvents(futureEvents, sourceEvent, result) {
        // Sort future events chronologically
        const sortedFutureEvents = futureEvents.sort((a, b) =>
            a.dateTimeMoment.valueOf() - b.dateTimeMoment.valueOf()
        )

        // Generate expected future dates based on source's current Recurring Days pattern
        const lookaheadEndDate = this._calculateLookaheadEndDate(sourceEvent)
        if (!lookaheadEndDate) {
            this.logger.log(`Cannot calculate lookahead for frequency: ${sourceEvent.frequency}, skipping updates`)
            return []
        }

        const expectedFutureDates = this._generateNewEventDates(sourceEvent, lookaheadEndDate)

        // Match existing events with new expected dates chronologically
        const updateCount = Math.min(sortedFutureEvents.length, expectedFutureDates.length)
        const updatedDates = []

        for (let i = 0; i < updateCount; i++) {
            const futureEvent = sortedFutureEvents[i]
            const newExpectedDate = expectedFutureDates[i]

            try {
                await this.updateEventFromSource(
                    futureEvent.notionPageId,
                    sourceEvent,
                    newExpectedDate.toISOString(true)
                )

                // Update the event's dateTime in allEvents to reflect the new time
                futureEvent.dateTime = newExpectedDate.toISOString(true)
                futureEvent.dateTimeMoment = newExpectedDate

                updatedDates.push(newExpectedDate.format('YYYY-MM-DDTHH:mm'))
                result.updated++
            } catch (error) {
                this.logger.error(`Error updating event ${futureEvent.notionPageId}: ${error}`)
                result.errors.push(`Update ${futureEvent.notionPageId}: ${error.message}`)
            }
        }

        return updatedDates
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

                await this.createEventFromSource(sourceEvent, newEventStartDate.toISOString(true))
                this.logger.log(`Created new event on ${newEventStartDate.format()} from source ${sourceEvent.name}`)
                result.created++
            } catch (error) {
                this.logger.error(`Error creating event for ${newEventStartDate.format()}: ${error.response.data.message || error}`)
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

    async createEventFromSource(sourceEvent, newStartDateTime) {
        const newProperties = this._copyPropertiesFromSource(sourceEvent, newStartDateTime)
        const sourceIcon = await this._getSourceIcon(sourceEvent.notionPageId)
        const sourceChildren = await this._getSourceBlocks(sourceEvent.notionPageId)

        await this.notionApi.createPage(this.apiKey, this.dataSourceId, newProperties, sourceIcon, sourceChildren)
    }

    async updateEventFromSource(targetPageId, sourceEvent, targetStartDateTime) {
        const updateProperties = this._copyPropertiesFromSource(sourceEvent, targetStartDateTime)
        const sourceIcon = await this._getSourceIcon(sourceEvent.notionPageId)
        const sourceChildren = await this._getSourceBlocks(sourceEvent.notionPageId)

        await this.notionApi.updatePage(this.apiKey, targetPageId, updateProperties, sourceIcon)
        await this.notionApi.replacePageBlocks(this.apiKey, targetPageId, sourceChildren)
    }

    _copyPropertiesFromSource(sourceEvent, newStartDateTime) {
        const sourceProps = sourceEvent.notionPage.properties
        const properties = {}

        for (const [key, value] of Object.entries(sourceProps)) {
            if (key === 'Date') {
                properties[key] = this._calculateDateProperty(sourceProps, newStartDateTime)
            } else if (key === 'Recurring Source') {
                properties[key] = { checkbox: false }
            } else if (key === 'Recurring ID') {
                properties[key] = {
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: sourceEvent.recurringId
                            }
                        }
                    ]
                }
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
            const durationMs = moment.parseZone(sourceEnd).diff(moment.parseZone(sourceStart))
            newEndDateTime = moment.parseZone(newStartDateTime).add(durationMs, 'milliseconds').toISOString(true)
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
            'relation': () => ({ relation: value.relation })    // If relation is not showing up, check that the database has given permission to the connection
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
            this.logger.log(`Skipping page "${event.name}": ${reason}`)
            result.skipped++
            return false
        }
        return true
    }

    _validateRecurringEventForAutoSync(event, result) {
        if (!event.frequency || !event.dateTime || event.cadence < 1 || event.lookaheadNumber < 1) {
            const reason = event.getValidationFailureReasonForAutoSync()
            this.logger.log(`Skipping page "${event.name}": ${reason}`)
            result.skipped++
            return false
        }

        if (event.frequency !== 'Daily' && event.frequency !== 'Weekly') {
            this.logger.log(`Skipping page "${event.name}": Unsupported frequency`)
            result.skipped++
            return false
        }

        if (event.frequency === 'Weekly' && event.recurringDays.length === 0) {
            this.logger.log(`Skipping page "${event.name}": Weekly frequency requires recurring days`)
            result.skipped++
            return false
        }

        return true
    }

    /* #endregion */

    /* #region Date Calculation and Generation Strategy */

    _calculateLookaheadEndDate(event) {
        // Use the event's timezone for calculating lookahead
        const now = event.timezone ? moment.tz(event.timezone) : moment().utcOffset(event.dateTimeMoment.utcOffset())
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

        // Ensure the event date preserves the timezone from source
        // If source has timezone, the clone will automatically handle DST transitions
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
        // Original: Read timezone from Notion property
        // this.timezone = props['Recurring Timezone']?.select?.name
        // Hardcoded to DEFAULT_TIMEZONE (America/Los_Angeles)
        this.timezone = DEFAULT_TIMEZONE

        // Create timezone-aware moment if timezone is specified, otherwise fallback to parseZone
        if (this.dateTime && this.timezone) {
            this.dateTimeMoment = moment.tz(this.dateTime, this.timezone)
        } else if (this.dateTime) {
            this.dateTimeMoment = moment.parseZone(this.dateTime)
        } else {
            this.dateTimeMoment = null
        }

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

    getValidationFailureReasonForAutoSync() {
        if (!this.frequency) return 'Missing frequency'
        if (!this.dateTime) return 'Missing date'
        if (this.cadence < 1) return 'Invalid cadence (< 1)'
        if (this.lookaheadNumber < 1) return 'Invalid lookahead number (< 1)'
        if (this.frequency === 'Weekly' && this.recurringDays.length === 0) {
            return 'Weekly frequency requires recurring days'
        }
        return 'Unknown'
    }
}

/* #endregion */

module.exports = {
    RecurringEventsService,
    Event
}
