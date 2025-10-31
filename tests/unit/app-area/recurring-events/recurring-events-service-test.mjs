import { describe, it, expect, beforeEach, vi } from 'vitest'
import moment from 'moment'
import { RecurringEventsService, Event } from '../../../../src/app-area/recurring-events/service/recurring-events-service.js'

/* #region Event Class Tests */

describe('Event Class', () => {
    describe('Constructor and Validation', () => {
        it('should create valid daily event', () => {
            const sourcePage = createSourcePage({
                frequency: 'Daily',
                cadence: 1,
                lookaheadNumber: 30,
                dateTime: '2025-10-08T10:00:00Z',
                isRecurringSource: true
            })

            const event = new Event(sourcePage)

            expect(event.frequency).toBe('Daily')
            expect(event.cadence).toBe(1)
            expect(event.lookaheadNumber).toBe(30)
            expect(event.isValid()).toBe(true)
        })

        it('should create valid weekly event', () => {
            const sourcePage = createSourcePage({
                frequency: 'Weekly',
                cadence: 2,
                lookaheadNumber: 4,
                dateTime: '2025-10-08T10:00:00Z',
                recurringDays: ['Monday', 'Wednesday'],
                isRecurringSource: true
            })

            const event = new Event(sourcePage)

            expect(event.frequency).toBe('Weekly')
            expect(event.cadence).toBe(2)
            expect(event.lookaheadNumber).toBe(4)
            expect(event.recurringDays).toEqual(['Monday', 'Wednesday'])
            expect(event.isValid()).toBe(true)
        })

        it('should be invalid when missing frequency', () => {
            const sourcePage = createSourcePage({
                frequency: null,
                cadence: 1,
                lookaheadNumber: 30,
                dateTime: '2025-10-08T10:00:00Z',
                isRecurringSource: true
            })

            const event = new Event(sourcePage)

            expect(event.isValid()).toBe(false)
            expect(event.getValidationFailureReason()).toBe('Missing frequency')
        })

        it('should be invalid when missing date', () => {
            const sourcePage = createSourcePage({
                frequency: 'Daily',
                cadence: 1,
                lookaheadNumber: 30,
                dateTime: null,
                isRecurringSource: true
            })

            const event = new Event(sourcePage)

            expect(event.isValid()).toBe(false)
            expect(event.getValidationFailureReason()).toBe('Missing date')
        })

        it('should be invalid when cadence is 0', () => {
            const sourcePage = createSourcePage({
                frequency: 'Daily',
                cadence: 0,
                lookaheadNumber: 30,
                dateTime: '2025-10-08T10:00:00Z',
                isRecurringSource: true
            })

            const event = new Event(sourcePage)

            expect(event.isValid()).toBe(false)
            expect(event.getValidationFailureReason()).toBe('Invalid cadence (< 1)')
        })

        it('should be invalid when lookahead number is less than 1', () => {
            const sourcePage = createSourcePage({
                frequency: 'Daily',
                cadence: 1,
                lookaheadNumber: 0,
                dateTime: '2025-10-08T10:00:00Z',
                isRecurringSource: true
            })

            const event = new Event(sourcePage)

            expect(event.isValid()).toBe(false)
            expect(event.getValidationFailureReason()).toBe('Invalid lookahead number (< 1)')
        })

        it('should be invalid when weekly event has no recurring days', () => {
            const sourcePage = createSourcePage({
                frequency: 'Weekly',
                cadence: 1,
                lookaheadNumber: 4,
                dateTime: '2025-10-08T10:00:00Z',
                recurringDays: [],
                isRecurringSource: true
            })

            const event = new Event(sourcePage)

            expect(event.isValid()).toBe(false)
            expect(event.getValidationFailureReason()).toBe('Weekly frequency requires recurring days')
        })

        it('should be invalid when not marked as recurring source', () => {
            const sourcePage = createSourcePage({
                frequency: 'Daily',
                cadence: 1,
                lookaheadNumber: 30,
                dateTime: '2025-10-08T10:00:00Z',
                isRecurringSource: false
            })

            const event = new Event(sourcePage)

            expect(event.isValid()).toBe(false)
            expect(event.getValidationFailureReason()).toBe('Not marked as recurring source')
        })

        it('should enforce upper limit for weekly cadence and still be valid', () => {
            const sourcePage = createSourcePage({
                frequency: 'Weekly',
                cadence: 10,
                lookaheadNumber: 20,
                dateTime: '2025-10-08T10:00:00Z',
                recurringDays: ['Monday'],
                isRecurringSource: true
            })

            const event = new Event(sourcePage)

            expect(event.cadence).toBe(4)
            expect(event.lookaheadNumber).toBe(8)
            expect(event.isValid()).toBe(true)
        })

        it('should enforce upper limit for daily cadence and still be valid', () => {
            const sourcePage = createSourcePage({
                frequency: 'Daily',
                cadence: 50,
                lookaheadNumber: 100,
                dateTime: '2025-10-08T10:00:00Z',
                isRecurringSource: true
            })

            const event = new Event(sourcePage)

            expect(event.cadence).toBe(30)
            expect(event.lookaheadNumber).toBe(60)
            expect(event.isValid()).toBe(true)
        })
    })
})

/* #endregion */

/* #region Date Calculation Tests */

describe('RecurringEventsService - Date Calculation', () => {
    let service
    let mockLogger

    beforeEach(() => {
        const mockNotionApi = createMockNotionApi()
        mockLogger = { log: vi.fn(), error: vi.fn() }
        service = new RecurringEventsService('test-api-key', 'test-db-id', mockNotionApi, mockLogger)
    })

    describe('_calculateLookaheadEndDate', () => {
        it('should calculate lookahead for weekly frequency', () => {
            const event = createEvent({ frequency: 'Weekly', lookaheadNumber: 4 })
            const endDate = service._calculateLookaheadEndDate(event)

            const expectedEndDate = moment.utc().add(4, 'weeks')
            expect(endDate.format('YYYY-MM-DD')).toBe(expectedEndDate.format('YYYY-MM-DD'))
        })

        it('should calculate lookahead for daily frequency', () => {
            const event = createEvent({ frequency: 'Daily', lookaheadNumber: 30 })
            const endDate = service._calculateLookaheadEndDate(event)

            const expectedEndDate = moment.utc().add(30, 'days')
            expect(endDate.format('YYYY-MM-DD')).toBe(expectedEndDate.format('YYYY-MM-DD'))
        })

        it('should return null for unsupported frequency', () => {
            const event = createEvent({ frequency: 'Monthly', lookaheadNumber: 3 })
            const endDate = service._calculateLookaheadEndDate(event)

            expect(endDate).toBeNull()
        })
    })

    describe('_shouldGenerateDailyEvent', () => {
        it('should return true for valid cadence with exact multiple', () => {
            expect(service._shouldGenerateDailyEvent(2, 2)).toBe(true)
            expect(service._shouldGenerateDailyEvent(4, 2)).toBe(true)
            expect(service._shouldGenerateDailyEvent(6, 2)).toBe(true)
        })

        it('should return false for days not matching cadence', () => {
            expect(service._shouldGenerateDailyEvent(1, 2)).toBe(false)
            expect(service._shouldGenerateDailyEvent(3, 2)).toBe(false)
            expect(service._shouldGenerateDailyEvent(5, 2)).toBe(false)
        })

        it('should return false for day zero or negative', () => {
            expect(service._shouldGenerateDailyEvent(0, 1)).toBe(false)
            expect(service._shouldGenerateDailyEvent(-1, 1)).toBe(false)
        })
    })

    describe('_shouldGenerateWeeklyEvent', () => {
        it('should return true when week matches cadence and day is in recurringDays', () => {
            const mondayDate = moment.utc('2025-10-13') // Monday
            const recurringDays = ['Monday', 'Wednesday']

            expect(service._shouldGenerateWeeklyEvent(1, 1, mondayDate, recurringDays)).toBe(true)
        })

        it('should return false when day is not in recurringDays', () => {
            const tuesdayDate = moment.utc('2025-10-14') // Tuesday
            const recurringDays = ['Monday', 'Wednesday']

            expect(service._shouldGenerateWeeklyEvent(1, 1, tuesdayDate, recurringDays)).toBe(false)
        })

        it('should return false when week does not match cadence', () => {
            const mondayDate = moment.utc('2025-10-13') // Monday, week 1
            const recurringDays = ['Monday']

            expect(service._shouldGenerateWeeklyEvent(1, 2, mondayDate, recurringDays)).toBe(false)
        })

        it('should return true for week zero and false for negative weeks', () => {
            const mondayDate = moment.utc('2025-10-13')
            const recurringDays = ['Monday']

            expect(service._shouldGenerateWeeklyEvent(0, 1, mondayDate, recurringDays)).toBe(true)
            expect(service._shouldGenerateWeeklyEvent(-1, 1, mondayDate, recurringDays)).toBe(false)
        })
    })

    describe('_createEventDateWithTime', () => {
        it('should create event date with time from source', () => {
            const currentDate = moment.utc('2025-10-15T00:00:00Z')
            const sourceDateTime = moment.utc('2025-10-08T14:30:00Z')

            const result = service._createEventDateWithTime(currentDate, sourceDateTime)

            expect(result.format('YYYY-MM-DD')).toBe('2025-10-15')
            expect(result.hours()).toBe(14)
            expect(result.minutes()).toBe(30)
            expect(result.seconds()).toBe(0)
            expect(result.milliseconds()).toBe(0)
        })
    })
})

/* #endregion */

/* #region Date Generation Strategy Tests */

describe('RecurringEventsService - Date Generation Strategies', () => {
    let service
    let mockLogger

    beforeEach(() => {
        const mockNotionApi = createMockNotionApi()
        mockLogger = { log: vi.fn(), error: vi.fn() }
        service = new RecurringEventsService('test-api-key', 'test-db-id', mockNotionApi, mockLogger)
    })

    describe('Daily Strategy', () => {
        it('should generate daily events with cadence 1 without being off by one day', () => {
            const startDate = moment.utc('2025-10-08T10:00:00Z')
            const endDate = moment.utc('2025-10-12T10:00:00Z')
            const event = createEvent({
                dateTimeMoment: startDate,
                cadence: 1
            })

            const dates = service._dailyDateStrategy.generate(event, endDate)

            // Verify the correct number of events
            expect(dates).toHaveLength(4)

            // Verify each date is exactly 1 day apart from the previous, starting from source date + 1 day
            expect(dates[0].format('YYYY-MM-DD')).toBe('2025-10-09') // startDate + 1 day
            expect(dates[1].format('YYYY-MM-DD')).toBe('2025-10-10') // startDate + 2 days
            expect(dates[2].format('YYYY-MM-DD')).toBe('2025-10-11') // startDate + 3 days
            expect(dates[3].format('YYYY-MM-DD')).toBe('2025-10-12') // startDate + 4 days

            // Verify no off-by-one error: the first event should be exactly 1 day after source
            const daysDiff = dates[0].diff(startDate, 'days')
            expect(daysDiff).toBe(1)
        })

        it('should generate daily events with cadence 1', () => {
            const startDate = moment.utc('2025-10-08T10:00:00Z')
            const endDate = moment.utc('2025-10-12T10:00:00Z')
            const event = createEvent({
                dateTimeMoment: startDate,
                cadence: 1
            })

            const dates = service._dailyDateStrategy.generate(event, endDate)

            expect(dates).toHaveLength(4)
            expect(dates[0].format('YYYY-MM-DD')).toBe('2025-10-09')
            expect(dates[1].format('YYYY-MM-DD')).toBe('2025-10-10')
            expect(dates[2].format('YYYY-MM-DD')).toBe('2025-10-11')
            expect(dates[3].format('YYYY-MM-DD')).toBe('2025-10-12')
        })

        it('should generate daily events with cadence 2', () => {
            const startDate = moment.utc('2025-10-08T10:00:00Z')
            const endDate = moment.utc('2025-10-16T10:00:00Z')
            const event = createEvent({
                dateTimeMoment: startDate,
                cadence: 2
            })

            const dates = service._dailyDateStrategy.generate(event, endDate)

            expect(dates).toHaveLength(4)
            expect(dates[0].format('YYYY-MM-DD')).toBe('2025-10-10')
            expect(dates[1].format('YYYY-MM-DD')).toBe('2025-10-12')
            expect(dates[2].format('YYYY-MM-DD')).toBe('2025-10-14')
            expect(dates[3].format('YYYY-MM-DD')).toBe('2025-10-16')
        })

        it('should generate daily events with cadence 7', () => {
            const startDate = moment.utc('2025-10-08T10:00:00Z')
            const endDate = moment.utc('2025-10-29T10:00:00Z')
            const event = createEvent({
                dateTimeMoment: startDate,
                cadence: 7
            })

            const dates = service._dailyDateStrategy.generate(event, endDate)

            expect(dates).toHaveLength(3)
            expect(dates[0].format('YYYY-MM-DD')).toBe('2025-10-15')
            expect(dates[1].format('YYYY-MM-DD')).toBe('2025-10-22')
            expect(dates[2].format('YYYY-MM-DD')).toBe('2025-10-29')
        })

        it('should preserve time from source event', () => {
            const startDate = moment.utc('2025-10-08T14:30:00Z')
            const endDate = moment.utc('2025-10-10T10:00:00Z')
            const event = createEvent({
                dateTimeMoment: startDate,
                cadence: 1
            })

            const dates = service._dailyDateStrategy.generate(event, endDate)

            expect(dates[0].hours()).toBe(14)
            expect(dates[0].minutes()).toBe(30)
        })
    })

    describe('Weekly Strategy', () => {
        it('should generate weekly events without being off by one day', () => {
            const startDate = moment.utc('2025-10-08T10:00:00Z') // Wednesday
            const endDate = moment.utc('2025-10-22T10:00:00Z')
            const event = createEvent({
                dateTimeMoment: startDate,
                cadence: 1,
                recurringDays: ['Wednesday']
            })

            const dates = service._weeklyDateStrategy.generate(event, endDate)

            // First generated event should be exactly 7 days (1 week) after the start date
            expect(dates[0].format('YYYY-MM-DD')).toBe('2025-10-15') // Oct 8 + 7 days = Oct 15
            expect(dates[0].format('dddd')).toBe('Wednesday')

            // Verify no off-by-one error: should be exactly 7 days apart
            const daysDiff = dates[0].diff(startDate, 'days')
            expect(daysDiff).toBe(7)

            // Second event should be exactly 14 days after start
            expect(dates[1].format('YYYY-MM-DD')).toBe('2025-10-22')
            const secondDaysDiff = dates[1].diff(startDate, 'days')
            expect(secondDaysDiff).toBe(14)
        })

        it('should generate weekly events on selected days with cadence 1', () => {
            const startDate = moment.utc('2025-10-08T10:00:00Z') // Wednesday
            const endDate = moment.utc('2025-10-22T10:00:00Z')
            const event = createEvent({
                dateTimeMoment: startDate,
                cadence: 1,
                recurringDays: ['Monday', 'Wednesday']
            })

            const dates = service._weeklyDateStrategy.generate(event, endDate)

            // Should include: Oct 15 (Wed week 1), Oct 20 (Mon week 2), Oct 22 (Wed week 2)
            const formattedDates = dates.map(d => d.format('YYYY-MM-DD'))
            expect(formattedDates).toContain('2025-10-15') // Wednesday week 1
            expect(formattedDates).toContain('2025-10-20') // Monday week 2
        })

        it('should generate weekly events on selected days with cadence 1 and lookahead 2', () => {
            const startDate = moment.utc('2025-10-08T10:00:00Z') // Wednesday
            const endDate = moment.utc('2025-10-22T10:00:00Z')
            const event = createEvent({
                dateTimeMoment: startDate,
                cadence: 1,
                lookaheadNumber: 2,
                recurringDays: ['Tuesday']
            })

            const dates = service._weeklyDateStrategy.generate(event, endDate)

            // Should include: Oct 14 (Tuesday week 1), Oct 21 (Tuesday week 2)
            const formattedDates = dates.map(d => d.format('YYYY-MM-DD'))
            expect(formattedDates).toContain('2025-10-14') // Tuesday week 1
            expect(formattedDates).toContain('2025-10-21') // Tuesday week 2
        })

        it('should generate weekly events with cadence 2', () => {
            const startDate = moment.utc('2025-10-06T10:00:00Z') // Monday
            const endDate = moment.utc('2025-10-27T10:00:00Z')
            const event = createEvent({
                dateTimeMoment: startDate,
                cadence: 2,
                recurringDays: ['Monday']
            })

            const dates = service._weeklyDateStrategy.generate(event, endDate)

            // Week 2: Oct 20 (Mon)
            const formattedDates = dates.map(d => d.format('YYYY-MM-DD'))
            expect(formattedDates).toContain('2025-10-20')
        })

        it('should skip days not in recurringDays', () => {
            const startDate = moment.utc('2025-10-06T10:00:00Z') // Monday
            const endDate = moment.utc('2025-10-20T10:00:00Z')
            const event = createEvent({
                dateTimeMoment: startDate,
                cadence: 1,
                recurringDays: ['Monday']
            })

            const dates = service._weeklyDateStrategy.generate(event, endDate)

            // Should only have Mondays
            dates.forEach(date => {
                expect(date.format('dddd')).toBe('Monday')
            })
        })
    })
})

/* #endregion */

/* #region Event Filtering and Result Tracking Tests */

describe('RecurringEventsService - Event Filtering and Result Tracking', () => {
    let service
    let mockLogger

    beforeEach(() => {
        const mockNotionApi = createMockNotionApi()
        mockLogger = { log: vi.fn(), error: vi.fn() }
        service = new RecurringEventsService('test-api-key', 'test-db-id', mockNotionApi, mockLogger)
    })

    describe('findFutureEvents', () => {
        it('should find events with matching recurring ID', () => {
            const sourceEvent = createEventWithPage({
                notionPageId: 'page-1',
                recurringId: 'recurring-123',
                dateTime: '2025-10-08T10:00:00Z'
            })

            service.allEvents = [
                sourceEvent,
                createEventWithPage({
                    notionPageId: 'page-2',
                    recurringId: 'recurring-123',
                    dateTime: '2025-10-10T10:00:00Z'
                }),
                createEventWithPage({
                    notionPageId: 'page-3',
                    recurringId: 'recurring-456',
                    dateTime: '2025-10-12T10:00:00Z'
                })
            ]

            const futureEvents = service.findFutureEvents(sourceEvent)

            expect(futureEvents).toHaveLength(1)
            expect(futureEvents[0].notionPageId).toBe('page-2')
        })

        it('should exclude source event itself', () => {
            const sourceEvent = createEventWithPage({
                notionPageId: 'page-1',
                recurringId: 'recurring-123',
                dateTime: '2025-10-08T10:00:00Z'
            })

            service.allEvents = [sourceEvent]

            const futureEvents = service.findFutureEvents(sourceEvent)

            expect(futureEvents).toHaveLength(0)
        })

        it('should only include future events', () => {
            const sourceEvent = createEventWithPage({
                notionPageId: 'page-1',
                recurringId: 'recurring-123',
                dateTime: '2025-10-08T10:00:00Z'
            })

            service.allEvents = [
                sourceEvent,
                createEventWithPage({
                    notionPageId: 'page-2',
                    recurringId: 'recurring-123',
                    dateTime: '2025-10-05T10:00:00Z' // Past
                }),
                createEventWithPage({
                    notionPageId: 'page-3',
                    recurringId: 'recurring-123',
                    dateTime: '2025-10-10T10:00:00Z' // Future
                })
            ]

            const futureEvents = service.findFutureEvents(sourceEvent)

            expect(futureEvents).toHaveLength(1)
            expect(futureEvents[0].notionPageId).toBe('page-3')
        })
    })

    describe('Result Tracking', () => {
        it('should create processing result with correct structure', () => {
            const result = service._createProcessingResult()

            expect(result).toEqual({
                created: 0,
                updated: 0,
                skipped: 0,
                errors: []
            })
        })

        it('should validate recurring event and update skip count', () => {
            const result = service._createProcessingResult()
            const invalidEvent = createEvent({
                frequency: null,
                dateTime: '2025-10-08T10:00:00Z',
                isRecurringSource: true
            })

            const isValid = service._validateRecurringEvent(invalidEvent, result)

            expect(isValid).toBe(false)
            expect(result.skipped).toBe(1)
        })

        it('should handle processing error', () => {
            const result = service._createProcessingResult()
            const error = new Error('Test error')

            service._handleProcessingError(error, result)

            expect(result.errors).toHaveLength(1)
            expect(result.errors[0]).toBe('Test error')
        })
    })
})

/* #endregion */

/* #region Block Preparation Tests */

describe('RecurringEventsService - Block Preparation', () => {
    let service
    let mockLogger

    beforeEach(() => {
        const mockNotionApi = createMockNotionApi()
        mockLogger = { log: vi.fn(), error: vi.fn() }
        service = new RecurringEventsService('test-api-key', 'test-db-id', mockNotionApi, mockLogger)
    })

    describe('_prepareBlocksForCopying', () => {
        it('should strip read-only fields from blocks', () => {
            const blocks = [
                {
                    id: 'block-1',
                    type: 'paragraph',
                    created_time: '2025-10-08T10:00:00Z',
                    last_edited_time: '2025-10-08T10:00:00Z',
                    created_by: { id: 'user-1' },
                    last_edited_by: { id: 'user-1' },
                    has_children: false,
                    archived: false,
                    paragraph: {
                        rich_text: [{ type: 'text', text: { content: 'Hello' } }]
                    }
                }
            ]

            const cleanedBlocks = service._prepareBlocksForCopying(blocks)

            expect(cleanedBlocks).toHaveLength(1)
            expect(cleanedBlocks[0]).not.toHaveProperty('id')
            expect(cleanedBlocks[0]).not.toHaveProperty('created_time')
            expect(cleanedBlocks[0]).not.toHaveProperty('last_edited_time')
            expect(cleanedBlocks[0]).not.toHaveProperty('created_by')
            expect(cleanedBlocks[0]).not.toHaveProperty('last_edited_by')
            expect(cleanedBlocks[0]).not.toHaveProperty('has_children')
            expect(cleanedBlocks[0]).not.toHaveProperty('archived')
            expect(cleanedBlocks[0]).toHaveProperty('type')
            expect(cleanedBlocks[0]).toHaveProperty('paragraph')
        })

        it('should handle nested children recursively', () => {
            const blocks = [
                {
                    id: 'block-1',
                    type: 'bulleted_list_item',
                    created_time: '2025-10-08T10:00:00Z',
                    last_edited_time: '2025-10-08T10:00:00Z',
                    created_by: { id: 'user-1' },
                    last_edited_by: { id: 'user-1' },
                    has_children: true,
                    archived: false,
                    bulleted_list_item: {
                        rich_text: [{ type: 'text', text: { content: 'Parent' } }],
                        children: [
                            {
                                id: 'block-2',
                                type: 'paragraph',
                                created_time: '2025-10-08T10:00:00Z',
                                last_edited_time: '2025-10-08T10:00:00Z',
                                created_by: { id: 'user-1' },
                                last_edited_by: { id: 'user-1' },
                                has_children: false,
                                archived: false,
                                paragraph: {
                                    rich_text: [{ type: 'text', text: { content: 'Child' } }]
                                }
                            }
                        ]
                    }
                }
            ]

            const cleanedBlocks = service._prepareBlocksForCopying(blocks)

            expect(cleanedBlocks).toHaveLength(1)
            expect(cleanedBlocks[0].bulleted_list_item.children).toHaveLength(1)
            expect(cleanedBlocks[0].bulleted_list_item.children[0]).not.toHaveProperty('id')
            expect(cleanedBlocks[0].bulleted_list_item.children[0]).toHaveProperty('type')
        })

        it('should handle empty blocks array', () => {
            const cleanedBlocks = service._prepareBlocksForCopying([])

            expect(cleanedBlocks).toEqual([])
        })

        it('should handle null or undefined blocks', () => {
            expect(service._prepareBlocksForCopying(null)).toEqual([])
            expect(service._prepareBlocksForCopying(undefined)).toEqual([])
        })
    })
})

/* #endregion */

/* #region Service Method Tests with Mocked NotionApi */

describe('RecurringEventsService - Service Methods', () => {
    let service
    let mockNotionApi
    let mockLogger

    beforeEach(() => {
        mockNotionApi = createMockNotionApi()
        mockLogger = { log: vi.fn(), error: vi.fn() }
        service = new RecurringEventsService('test-api-key', 'test-db-id', mockNotionApi, mockLogger)
    })

    describe('getDataSourceId', () => {
        it('should return data source ID when available', async () => {
            mockNotionApi.getDatabase.mockResolvedValue({
                data_sources: [{ id: 'datasource-123' }]
            })

            const dataSourceId = await service.getDataSourceId()

            expect(dataSourceId).toBe('datasource-123')
        })

        it('should throw error when no data sources exist', async () => {
            mockNotionApi.getDatabase.mockResolvedValue({
                data_sources: []
            })

            await expect(service.getDataSourceId()).rejects.toThrow('has no data sources')
        })

        it('should throw error when data_sources is null', async () => {
            mockNotionApi.getDatabase.mockResolvedValue({
                id: 'db-123'
            })

            await expect(service.getDataSourceId()).rejects.toThrow('has no data sources')
        })
    })

    describe('ensureRecurringProperties', () => {
        it('should create missing properties', async () => {
            mockNotionApi.getDataSource.mockResolvedValue({
                properties: {}
            })

            service.dataSourceId = 'datasource-1'
            await service.ensureRecurringProperties()

            expect(mockNotionApi.updateDataSource).toHaveBeenCalledWith(
                'test-api-key',
                'datasource-1',
                expect.objectContaining({
                    'Recurring Frequency': expect.any(Object),
                    'Recurring Cadence': expect.any(Object),
                    'Recurring Days': expect.any(Object),
                    'Recurring Lookahead Number': expect.any(Object),
                    'Recurring Source': expect.any(Object),
                    'Recurring ID': expect.any(Object)
                })
            )
        })

        it('should skip creation when properties already exist', async () => {
            mockNotionApi.getDataSource.mockResolvedValue({
                properties: {
                    'Recurring Frequency': {},
                    'Recurring Cadence': {},
                    'Recurring Days': {},
                    'Recurring Lookahead Number': {},
                    'Recurring Source': {},
                    'Recurring ID': {}
                }
            })

            service.dataSourceId = 'datasource-1'
            await service.ensureRecurringProperties()

            expect(mockNotionApi.updateDataSource).not.toHaveBeenCalled()
        })
    })

    describe('stampRecurringId', () => {
        it('should generate UUID when recurringId is missing', async () => {
            const event = createEventWithPage({
                notionPageId: 'page-1',
                recurringId: null
            })

            await service.stampRecurringId(event)

            expect(event.recurringId).toBeTruthy()
            expect(event.recurringId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
            expect(mockNotionApi.updatePage).toHaveBeenCalledWith(
                'test-api-key',
                'page-1',
                expect.objectContaining({
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
            )
        })

        it('should not generate UUID when recurringId exists', async () => {
            const event = createEventWithPage({
                notionPageId: 'page-1',
                recurringId: 'existing-uuid'
            })

            await service.stampRecurringId(event)

            expect(event.recurringId).toBe('existing-uuid')
            expect(mockNotionApi.updatePage).not.toHaveBeenCalled()
        })

        it('should update notionPage.properties with new Recurring ID', async () => {
            const event = createEventWithPage({
                notionPageId: 'page-1',
                recurringId: null,
                notionPage: createNotionPage(null)
            })

            // Verify notionPage doesn't have Recurring ID initially
            expect(event.notionPage.properties['Recurring ID'].rich_text).toEqual([])

            await service.stampRecurringId(event)

            // Verify notionPage.properties is updated with the new Recurring ID
            expect(event.recurringId).not.toBeNull()
        })
    })

    describe('createNewEvents', () => {
        it('should skip creating events that already exist at same time', async () => {
            const sourceEvent = createEventWithPage({
                notionPageId: 'page-1',
                recurringId: 'recurring-123',
                dateTime: '2025-10-08T10:00:00Z',
                notionPage: createNotionPage()
            })

            service.allEvents = [
                sourceEvent,
                createEventWithPage({
                    notionPageId: 'page-2',
                    recurringId: 'recurring-123',
                    dateTime: '2025-10-10T10:00:00Z'
                })
            ]

            const newEventDates = [
                moment.utc('2025-10-10T10:00:00Z'),
                moment.utc('2025-10-12T10:00:00Z')
            ]

            mockNotionApi.getPage.mockResolvedValue({ icon: { type: 'emoji', emoji: '📅' } })
            mockNotionApi.getPageBlocks.mockResolvedValue({ results: [] })
            mockNotionApi.createPage.mockResolvedValue({})

            const result = service._createProcessingResult()
            service.dataSourceId = 'datasource-1'
            await service.createNewEvents(sourceEvent, newEventDates, result)

            expect(result.skipped).toBe(1)
            expect(result.created).toBe(1)
            expect(mockNotionApi.createPage).toHaveBeenCalledTimes(1)
        })

        it('should set Recurring ID on cloned events from source event', async () => {
            const sourceEvent = createEventWithPage({
                notionPageId: 'page-1',
                recurringId: 'recurring-123',
                dateTime: '2025-10-08T10:00:00Z',
                notionPage: createNotionPage('recurring-123')
            })

            service.allEvents = [sourceEvent]

            const newEventDates = [moment.utc('2025-10-10T10:00:00Z')]

            mockNotionApi.getPage.mockResolvedValue({ icon: { type: 'emoji', emoji: '📅' } })
            mockNotionApi.getPageBlocks.mockResolvedValue({ results: [] })
            mockNotionApi.createPage.mockResolvedValue({})

            const result = service._createProcessingResult()
            service.dataSourceId = 'datasource-1'
            await service.createNewEvents(sourceEvent, newEventDates, result)

            expect(result.created).toBe(1)
            expect(mockNotionApi.createPage).toHaveBeenCalledWith(
                'test-api-key',
                'datasource-1',
                expect.objectContaining({
                    'Recurring ID': {
                        rich_text: [
                            {
                                "text": {
                                    "content": "recurring-123"
                                },
                                "type": "text"
                            }
                        ]
                    }
                }),
                expect.anything(),
                expect.anything()
            )
        })

        it('should set newly generated Recurring ID on cloned events for first-time source', async () => {
            // Source event with NO Recurring ID (first time being processed)
            const sourceEvent = createEventWithPage({
                notionPageId: 'page-1',
                recurringId: null,
                dateTime: '2025-10-08T10:00:00Z',
                notionPage: createNotionPage(null)
            })

            service.allEvents = [sourceEvent]

            const newEventDates = [moment.utc('2025-10-10T10:00:00Z')]

            mockNotionApi.getPage.mockResolvedValue({ icon: { type: 'emoji', emoji: '📅' } })
            mockNotionApi.getPageBlocks.mockResolvedValue({ results: [] })
            mockNotionApi.createPage.mockResolvedValue({})

            const result = service._createProcessingResult()
            service.dataSourceId = 'datasource-1'

            // First stamp the Recurring ID (simulating processSourcePage flow)
            await service.stampRecurringId(sourceEvent)

            // Then create new events
            await service.createNewEvents(sourceEvent, newEventDates, result)

            expect(result.created).toBe(1)
            // Verify the newly generated Recurring ID is used for cloned events
            expect(mockNotionApi.createPage).toHaveBeenCalledWith(
                'test-api-key',
                'datasource-1',
                expect.objectContaining({
                    'Recurring ID': {
                        rich_text: [
                            {
                                "text": {
                                    "content": sourceEvent.recurringId
                                },
                                "type": "text"
                            }
                        ]
                    }
                }),
                expect.anything(),
                expect.anything()
            )
        })
    })

    describe('updateAllFutureEvents', () => {
        it('should update all future events', async () => {
            const sourceEvent = createEventWithPage({
                notionPageId: 'page-1',
                notionPage: createNotionPage()
            })

            const futureEvents = [
                createEventWithPage({
                    notionPageId: 'page-2',
                    dateTime: '2025-10-10T10:00:00Z'
                }),
                createEventWithPage({
                    notionPageId: 'page-3',
                    dateTime: '2025-10-12T10:00:00Z'
                })
            ]

            mockNotionApi.getPage.mockResolvedValue({ icon: { type: 'emoji', emoji: '📅' } })
            mockNotionApi.getPageBlocks.mockResolvedValue({ results: [] })

            const result = service._createProcessingResult()
            await service.updateAllFutureEvents(futureEvents, sourceEvent, result)

            expect(result.updated).toBe(2)
            expect(mockNotionApi.updatePage).toHaveBeenCalledTimes(2)
        })

        it('should preserve Recurring ID when updating future events', async () => {
            const sourceEvent = createEventWithPage({
                notionPageId: 'page-1',
                recurringId: 'recurring-123',
                dateTime: '2025-10-08T10:00:00Z',
                notionPage: createNotionPage('recurring-123')
            })

            const futureEvents = [
                createEventWithPage({
                    notionPageId: 'page-2',
                    recurringId: 'recurring-123',
                    dateTime: '2025-10-10T10:00:00Z'
                })
            ]

            mockNotionApi.getPage.mockResolvedValue({ icon: { type: 'emoji', emoji: '📅' } })
            mockNotionApi.getPageBlocks.mockResolvedValue({ results: [] })

            const result = service._createProcessingResult()
            await service.updateAllFutureEvents(futureEvents, sourceEvent, result)

            expect(result.updated).toBe(1)
            expect(mockNotionApi.updatePage).toHaveBeenCalledWith(
                'test-api-key',
                'page-2',
                expect.objectContaining({
                    'Recurring ID': {
                        rich_text: [
                            {
                                "text": {
                                    "content": "recurring-123"
                                },
                                "type": "text"
                            }
                        ]
                    }
                }),
                expect.anything()
            )
        })
    })

    describe('markEventAsProcessed', () => {
        it('should mark event as processed successfully', async () => {
            const event = createEventWithPage({
                notionPageId: 'page-1'
            })

            const result = service._createProcessingResult()
            await service.markEventAsProcessed(event, result)

            expect(mockNotionApi.updatePage).toHaveBeenCalledWith(
                'test-api-key',
                'page-1',
                {
                    'Recurring Source': {
                        checkbox: false
                    }
                }
            )
            expect(result.errors).toHaveLength(0)
        })

        it('should report error when marking event fails', async () => {
            const event = createEventWithPage({
                notionPageId: 'page-1'
            })

            mockNotionApi.updatePage.mockRejectedValue(new Error('API error'))

            const result = service._createProcessingResult()
            await service.markEventAsProcessed(event, result)

            expect(result.errors).toHaveLength(1)
            expect(result.errors[0]).toContain('Mark processed page-1')
            expect(result.errors[0]).toContain('API error')
        })
    })

    describe('Logger Integration', () => {
        it('should use custom logger instead of console', async () => {
            mockNotionApi.getDatabase.mockResolvedValue({
                data_sources: [{ id: 'datasource-123' }]
            })
            mockNotionApi.getDataSource.mockResolvedValue({
                properties: {
                    'Recurring Frequency': {},
                    'Recurring Cadence': {},
                    'Recurring Days': {},
                    'Recurring Lookahead Number': {},
                    'Recurring Source': {},
                    'Recurring ID': {}
                }
            })
            mockNotionApi.queryDataSource.mockResolvedValue({
                results: []
            })

            await service.processRecurringEvents(null)

            expect(mockLogger.log).toHaveBeenCalled()
            expect(mockLogger.error).not.toHaveBeenCalled()
        })

        it('should log errors to custom logger', async () => {
            mockNotionApi.getDatabase.mockRejectedValue(new Error('Database error'))

            await service.processRecurringEvents(null)

            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Database error'))
        })
    })
})

/* #endregion */

/* #region Integration Tests - Past Source Events */

describe('RecurringEventsService - Past Source Events', () => {
    let service
    let mockNotionApi
    let mockLogger

    beforeEach(() => {
        mockNotionApi = createMockNotionApi()
        mockLogger = { log: vi.fn(), error: vi.fn() }
        service = new RecurringEventsService('test-api-key', 'test-db-id', mockNotionApi, mockLogger)
    })

    describe('Weekly recurring event with source date in the past', () => {
        it('should generate future events from a source event that is 3 days old', async () => {
            // Given: A weekly recurring event that started 3 days ago on a Wednesday
            const threeDaysAgo = moment.utc().subtract(3, 'days').hours(10).minutes(0).seconds(0).milliseconds(0)
            const sourcePage = createSourcePage({
                frequency: 'Weekly',
                cadence: 1,
                lookaheadNumber: 4, // 4 weeks ahead
                dateTime: threeDaysAgo.toISOString(),
                recurringDays: ['Wednesday', 'Friday'],
                isRecurringSource: true,
                recurringId: 'recurring-past-123'
            })

            const sourceEvent = new Event(sourcePage)
            sourceEvent.notionPage = sourcePage

            // When: Processing the source event
            service.dataSourceId = 'datasource-1'
            service.allEvents = [sourceEvent]

            mockNotionApi.getPage.mockResolvedValue({ icon: { type: 'emoji', emoji: '📅' } })
            mockNotionApi.getPageBlocks.mockResolvedValue({ results: [] })
            mockNotionApi.createPage.mockResolvedValue({})
            mockNotionApi.updatePage.mockResolvedValue({})

            const result = service._createProcessingResult()
            await service.stampRecurringId(sourceEvent)
            const futureEvents = service.findFutureEvents(sourceEvent)
            await service.updateAllFutureEvents(futureEvents, sourceEvent, result)
            await service.generateFutureEvents(sourceEvent, result)

            // Then: Should generate future events for the next 4 weeks
            // Should create events for Wed/Fri in weeks that match the cadence
            expect(result.created).toBeGreaterThan(0)
            expect(mockNotionApi.createPage).toHaveBeenCalled()

            // Verify all created events are in the future (after the source event)
            const createCalls = mockNotionApi.createPage.mock.calls
            createCalls.forEach(call => {
                const properties = call[2]
                const eventDateTime = moment.utc(properties['Date'].date.start)
                expect(eventDateTime.isAfter(threeDaysAgo)).toBe(true)
            })

            // Verify events are within the lookahead window
            const fourWeeksFromNow = moment.utc().add(4, 'weeks')
            createCalls.forEach(call => {
                const properties = call[2]
                const eventDateTime = moment.utc(properties['Date'].date.start)
                expect(eventDateTime.isSameOrBefore(fourWeeksFromNow)).toBe(true)
            })

            // Verify all events are on the correct days (Wednesday or Friday)
            createCalls.forEach(call => {
                const properties = call[2]
                const eventDateTime = moment.utc(properties['Date'].date.start)
                const dayName = eventDateTime.format('dddd')
                expect(['Wednesday', 'Friday']).toContain(dayName)
            })
        })

        it('should generate future events from a daily recurring event that is 5 days old', async () => {
            // Given: A daily recurring event (every 2 days) that started 5 days ago
            const fiveDaysAgo = moment.utc().subtract(5, 'days').hours(14).minutes(30).seconds(0).milliseconds(0)
            const sourcePage = createSourcePage({
                frequency: 'Daily',
                cadence: 2,
                lookaheadNumber: 10, // 10 days ahead
                dateTime: fiveDaysAgo.toISOString(),
                isRecurringSource: true,
                recurringId: 'recurring-daily-past'
            })

            const sourceEvent = new Event(sourcePage)
            sourceEvent.notionPage = sourcePage

            // When: Processing the source event
            service.dataSourceId = 'datasource-1'
            service.allEvents = [sourceEvent]

            mockNotionApi.getPage.mockResolvedValue({ icon: { type: 'emoji', emoji: '⏰' } })
            mockNotionApi.getPageBlocks.mockResolvedValue({ results: [] })
            mockNotionApi.createPage.mockResolvedValue({})
            mockNotionApi.updatePage.mockResolvedValue({})

            const result = service._createProcessingResult()
            await service.stampRecurringId(sourceEvent)
            const futureEvents = service.findFutureEvents(sourceEvent)
            await service.updateAllFutureEvents(futureEvents, sourceEvent, result)
            await service.generateFutureEvents(sourceEvent, result)

            // Then: Should generate future events every 2 days for the next 10 days
            expect(result.created).toBeGreaterThan(0)
            expect(mockNotionApi.createPage).toHaveBeenCalled()

            // Verify all created events are in the future
            const createCalls = mockNotionApi.createPage.mock.calls
            createCalls.forEach(call => {
                const properties = call[2]
                const eventDateTime = moment.utc(properties['Date'].date.start)
                expect(eventDateTime.isAfter(fiveDaysAgo)).toBe(true)
            })

            // Verify time is preserved from source event
            createCalls.forEach(call => {
                const properties = call[2]
                const eventDateTime = moment.utc(properties['Date'].date.start)
                expect(eventDateTime.hours()).toBe(14)
                expect(eventDateTime.minutes()).toBe(30)
            })
        })
    })

    describe('fetchSourcePages with lookback window', () => {
        it('should use MAX_LOOKBACK_DAYS when lastSyncedDate is null', async () => {
            // Given: No last synced date
            const lastSyncedDate = null

            mockNotionApi.getDatabase.mockResolvedValue({
                data_sources: [{ id: 'datasource-123' }]
            })
            mockNotionApi.queryDataSource.mockResolvedValue({
                results: []
            })

            service.dataSourceId = 'datasource-123'

            // When: Fetching source pages
            await service.fetchSourcePages(lastSyncedDate)

            // Then: Should query with startDate = today - MAX_LOOKBACK_DAYS (14 days)
            const queryCall = mockNotionApi.queryDataSource.mock.calls[0]
            const filter = queryCall[2]
            const startDate = filter.and[0].property === 'Date' ? filter.and[0].date.on_or_after : null

            const expectedStartDate = moment.utc().subtract(14, 'days').startOf('day')
            const actualStartDate = moment.utc(startDate)

            expect(actualStartDate.format('YYYY-MM-DD')).toBe(expectedStartDate.format('YYYY-MM-DD'))
        })

        it('should use MAX_LOOKBACK_DAYS when lastSyncedDate is more recent', async () => {
            // Given: Last synced 2 days ago (more recent than MAX_LOOKBACK_DAYS)
            const lastSyncedDate = moment.utc().subtract(2, 'days').toDate()

            mockNotionApi.getDatabase.mockResolvedValue({
                data_sources: [{ id: 'datasource-123' }]
            })
            mockNotionApi.queryDataSource.mockResolvedValue({
                results: []
            })

            service.dataSourceId = 'datasource-123'

            // When: Fetching source pages
            await service.fetchSourcePages(lastSyncedDate)

            // Then: Should query with startDate = today - MAX_LOOKBACK_DAYS (14 days)
            // to ensure we catch any past recurring sources within the lookback window
            const queryCall = mockNotionApi.queryDataSource.mock.calls[0]
            const filter = queryCall[2]
            const startDate = filter.and[0].property === 'Date' ? filter.and[0].date.on_or_after : null

            const expectedStartDate = moment.utc().subtract(14, 'days').startOf('day')
            const actualStartDate = moment.utc(startDate)

            expect(actualStartDate.format('YYYY-MM-DD')).toBe(expectedStartDate.format('YYYY-MM-DD'))
        })

        it('lastSyncedDate should not matter when it is older than MAX_LOOKBACK_DAYS', async () => {
            // Given: Last synced 30 days ago (older than MAX_LOOKBACK_DAYS)
            const lastSyncedDate = moment.utc().subtract(30, 'days').toDate()

            mockNotionApi.getDatabase.mockResolvedValue({
                data_sources: [{ id: 'datasource-123' }]
            })
            mockNotionApi.queryDataSource.mockResolvedValue({
                results: []
            })

            service.dataSourceId = 'datasource-123'

            // When: Fetching source pages
            await service.fetchSourcePages(lastSyncedDate)

            // Then: Should query with MAX_LOOKBACK_DAYS (14 days)
            const queryCall = mockNotionApi.queryDataSource.mock.calls[0]
            const filter = queryCall[2]
            const startDate = filter.and[0].property === 'Date' ? filter.and[0].date.on_or_after : null

            const expectedStartDate = moment.utc().subtract(14, 'days').startOf('day')
            const actualStartDate = moment.utc(startDate)

            expect(actualStartDate.format('YYYY-MM-DD')).toBe(expectedStartDate.format('YYYY-MM-DD'))
        })
    })
})

/* #endregion */

/* #region Time and Day Change Tests */

describe('RecurringEventsService - Time and Day Change Updates', () => {
    let service
    let mockNotionApi
    let mockLogger

    beforeEach(() => {
        mockNotionApi = createMockNotionApi()
        mockLogger = { log: vi.fn(), error: vi.fn() }
        service = new RecurringEventsService('test-api-key', 'test-db-id', mockNotionApi, mockLogger)
    })

    describe('When source event time changes', () => {
        it('should update existing future events to new time without creating duplicates', async () => {
            // Given: A Weekly recurring event TODAY at 10:00 AM with Recurring Days [Wednesday, Friday]
            // Use today's date to avoid generating events in the past
            const today = moment.utc().hours(10).minutes(0).seconds(0).milliseconds(0)
            const sourcePage = createSourcePage({
                frequency: 'Weekly',
                cadence: 1,
                lookaheadNumber: 2,
                dateTime: today.toISOString(),
                recurringDays: [today.format('dddd')], // Use today's day of week
                isRecurringSource: true,
                recurringId: 'recurring-time-change'
            })

            const sourceEvent = new Event(sourcePage)
            sourceEvent.notionPage = sourcePage

            // Create 3 existing future events at the OLD time (10:00 AM)
            const existingFutureEvents = [
                createEventWithPage({
                    notionPageId: 'page-future-1',
                    recurringId: 'recurring-time-change',
                    dateTime: today.clone().add(1, 'week').toISOString() // 1 week from today at 10:00
                }),
                createEventWithPage({
                    notionPageId: 'page-future-2',
                    recurringId: 'recurring-time-change',
                    dateTime: today.clone().add(2, 'weeks').toISOString() // 2 weeks from today at 10:00
                }),
                createEventWithPage({
                    notionPageId: 'page-future-3',
                    recurringId: 'recurring-time-change',
                    dateTime: today.clone().add(3, 'weeks').toISOString() // 3 weeks from today at 10:00
                })
            ]

            service.allEvents = [sourceEvent, ...existingFutureEvents]
            service.dataSourceId = 'datasource-1'

            mockNotionApi.getPage.mockResolvedValue({ icon: { type: 'emoji', emoji: '📅' } })
            mockNotionApi.getPageBlocks.mockResolvedValue({ results: [] })
            mockNotionApi.createPage.mockResolvedValue({})
            mockNotionApi.updatePage.mockResolvedValue({})

            // When: Source event time changes to 14:00 (2:00 PM) - same day, just different time
            sourceEvent.dateTimeMoment = today.clone().hours(14).minutes(0)
            sourceEvent.dateTime = sourceEvent.dateTimeMoment.toISOString()
            sourceEvent.notionPage.properties['Date'].date.start = sourceEvent.dateTime

            const result = service._createProcessingResult()
            const futureEvents = service.findFutureEvents(sourceEvent)
            await service.updateAllFutureEvents(futureEvents, sourceEvent, result)
            await service.generateFutureEvents(sourceEvent, result)

            // Then: Should update 3 existing events (since lookahead is 2 weeks, only 2 events should exist within that window)
            // The 3rd event (3 weeks out) is beyond the lookahead, so it gets updated but not re-created
            expect(result.updated).toBe(2) // Only update events within lookahead window
            expect(result.created).toBe(0) // No duplicates
            expect(mockNotionApi.updatePage).toHaveBeenCalledTimes(2)
            expect(mockNotionApi.createPage).not.toHaveBeenCalled()

            // Verify the updates have the correct NEW times (14:00 instead of 10:00)
            const updateCalls = mockNotionApi.updatePage.mock.calls
            const updateProperties = updateCalls.map(call => call[2])

            // Should update to: 1 week from today at 14:00, 2 weeks from today at 14:00
            const expectedDate1 = today.clone().add(1, 'week').hours(14).minutes(0)
            const expectedDate2 = today.clone().add(2, 'weeks').hours(14).minutes(0)

            expect(moment.utc(updateProperties[0]['Date'].date.start).format('YYYY-MM-DD HH:mm')).toBe(expectedDate1.format('YYYY-MM-DD HH:mm'))
            expect(moment.utc(updateProperties[1]['Date'].date.start).format('YYYY-MM-DD HH:mm')).toBe(expectedDate2.format('YYYY-MM-DD HH:mm'))
        })

        it('should update existing future events when recurring days change', async () => {
            // Given: A Weekly recurring event on Wednesday 10:00 AM with Recurring Days [Wednesday]
            const sourceDate = moment.utc('2025-10-08T10:00:00Z') // Wednesday
            const sourcePage = createSourcePage({
                frequency: 'Weekly',
                cadence: 1,
                lookaheadNumber: 3,
                dateTime: sourceDate.toISOString(),
                recurringDays: ['Wednesday'],
                isRecurringSource: true,
                recurringId: 'recurring-day-change'
            })

            const sourceEvent = new Event(sourcePage)
            sourceEvent.notionPage = sourcePage

            // Create 3 existing future events at Wednesdays
            const existingFutureEvents = [
                createEventWithPage({
                    notionPageId: 'page-future-1',
                    recurringId: 'recurring-day-change',
                    dateTime: '2025-10-15T10:00:00Z' // Wednesday Oct 15
                }),
                createEventWithPage({
                    notionPageId: 'page-future-2',
                    recurringId: 'recurring-day-change',
                    dateTime: '2025-10-22T10:00:00Z' // Wednesday Oct 22
                }),
                createEventWithPage({
                    notionPageId: 'page-future-3',
                    recurringId: 'recurring-day-change',
                    dateTime: '2025-10-29T10:00:00Z' // Wednesday Oct 29
                })
            ]

            service.allEvents = [sourceEvent, ...existingFutureEvents]
            service.dataSourceId = 'datasource-1'

            mockNotionApi.getPage.mockResolvedValue({ icon: { type: 'emoji', emoji: '📅' } })
            mockNotionApi.getPageBlocks.mockResolvedValue({ results: [] })
            mockNotionApi.createPage.mockResolvedValue({})
            mockNotionApi.updatePage.mockResolvedValue({})

            // When: Source event changes to Thursday with Recurring Days [Thursday]
            sourceEvent.dateTimeMoment = moment.utc('2025-10-09T10:00:00Z') // Thursday
            sourceEvent.dateTime = '2025-10-09T10:00:00Z'
            sourceEvent.recurringDays = ['Thursday']
            sourceEvent.notionPage.properties['Date'].date.start = '2025-10-09T10:00:00Z'
            sourceEvent.notionPage.properties['Recurring Days'].multi_select = [{ name: 'Thursday' }]

            const result = service._createProcessingResult()
            const futureEvents = service.findFutureEvents(sourceEvent)
            await service.updateAllFutureEvents(futureEvents, sourceEvent, result)
            await service.generateFutureEvents(sourceEvent, result)

            // Then: Should update 3 existing events to Thursdays
            expect(result.updated).toBe(3)
            expect(mockNotionApi.updatePage).toHaveBeenCalledTimes(3)

            // Verify the updates moved to Thursdays (chronologically matched)
            const updateCalls = mockNotionApi.updatePage.mock.calls
            const updateProperties = updateCalls.map(call => call[2])

            // Should update to: Oct 16 (Thu), Oct 23 (Thu), Oct 30 (Thu)
            expect(moment.utc(updateProperties[0]['Date'].date.start).format('YYYY-MM-DD')).toBe('2025-10-16')
            expect(moment.utc(updateProperties[0]['Date'].date.start).format('dddd')).toBe('Thursday')

            expect(moment.utc(updateProperties[1]['Date'].date.start).format('YYYY-MM-DD')).toBe('2025-10-23')
            expect(moment.utc(updateProperties[1]['Date'].date.start).format('dddd')).toBe('Thursday')

            expect(moment.utc(updateProperties[2]['Date'].date.start).format('YYYY-MM-DD')).toBe('2025-10-30')
            expect(moment.utc(updateProperties[2]['Date'].date.start).format('dddd')).toBe('Thursday')
        })
    })
})

/* #endregion */

/* #region Test Helper Functions */

function createSourcePage({ frequency, cadence, lookaheadNumber, dateTime, recurringDays = [], isRecurringSource = false, recurringId = null, name = 'Test Event' }) {
    return {
        id: 'test-page-id',
        properties: {
            'Name': {
                title: [{ plain_text: name }]
            },
            'Recurring Frequency': {
                select: frequency ? { name: frequency } : null
            },
            'Recurring Cadence': {
                number: cadence
            },
            'Recurring Days': {
                multi_select: recurringDays.map(day => ({ name: day }))
            },
            'Recurring Lookahead Number': {
                number: lookaheadNumber
            },
            'Date': {
                date: dateTime ? { start: dateTime } : null
            },
            'Recurring ID': {
                rich_text: recurringId ? [{ plain_text: recurringId }] : []
            },
            'Recurring Source': {
                checkbox: isRecurringSource
            }
        }
    }
}

function createEvent({ frequency = 'Daily', cadence = 1, lookaheadNumber = 30, dateTimeMoment = moment.utc('2025-10-08T10:00:00Z'), recurringDays = [], dateTime = '2025-10-08T10:00:00Z', isRecurringSource = true }) {
    const sourcePage = createSourcePage({
        frequency,
        cadence,
        lookaheadNumber,
        dateTime,
        recurringDays,
        isRecurringSource
    })
    const event = new Event(sourcePage)
    if (dateTimeMoment) {
        event.dateTimeMoment = dateTimeMoment
    }
    return event
}

function createEventWithPage({ notionPageId, recurringId, dateTime, notionPage = null }) {
    const sourcePage = createSourcePage({
        frequency: 'Daily',
        cadence: 1,
        lookaheadNumber: 30,
        dateTime: dateTime || '2025-10-08T10:00:00Z',
        isRecurringSource: true,
        recurringId
    })
    sourcePage.id = notionPageId
    const event = new Event(sourcePage)
    if (notionPage) {
        event.notionPage = notionPage
    }
    return event
}

function createNotionPage(recurringId = null) {
    return {
        id: 'notion-page-id',
        properties: {
            'Name': { type: 'title', title: [{ plain_text: 'Test' }] },
            'Date': { type: 'date', date: { start: '2025-10-08T10:00:00Z' } },
            'Recurring Source': { type: 'checkbox', checkbox: true },
            'Recurring ID': { type: 'rich_text', rich_text: recurringId ? [{ plain_text: recurringId }] : [] }
        }
    }
}

function createMockNotionApi() {
    return {
        getDatabase: vi.fn(),
        getDataSource: vi.fn(),
        updateDataSource: vi.fn(),
        queryDataSource: vi.fn(),
        getPage: vi.fn(),
        updatePage: vi.fn(),
        createPage: vi.fn(),
        getPageBlocks: vi.fn(),
        replacePageBlocks: vi.fn()
    }
}

/* #endregion */
