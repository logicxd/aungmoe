"use strict";

const cron = require('node-cron')
const axios = require('axios')

/**
 * Scheduler for Notion Recurring Events
 *
 * This scheduler runs daily to automatically sync all recurring event configurations.
 * It calls the internal API endpoint to process all configs.
 *
 * Environment Variables Required:
 * - RECURRING_EVENTS_SCHEDULER_TOKEN: Secret token for authenticating scheduler requests
 * - RECURRING_EVENTS_SCHEDULER_ENABLED: Set to 'true' to enable the scheduler (default: false)
 * - RECURRING_EVENTS_SCHEDULER_CRON: Cron expression for schedule (default: '0 2 * * *' = 2 AM daily)
 * - PORT: Application port (default: 8081)
 */

class RecurringEventsScheduler {
    constructor() {
        this.isEnabled = process.env.RECURRING_EVENTS_SCHEDULER_ENABLED === 'true'
        this.cronExpression = process.env.RECURRING_EVENTS_SCHEDULER_CRON || '0 2 * * *' // Default: 2 AM daily
        this.schedulerToken = process.env.RECURRING_EVENTS_SCHEDULER_TOKEN
        this.port = process.env.PORT || 8081
        this.apiUrl = `http://localhost:${this.port}/recurring-events/scheduler/sync-all`
        this.task = null
    }

    /**
     * Initialize and start the scheduler
     */
    start() {
        if (!this.isEnabled) {
            console.log('Recurring Events Scheduler: DISABLED (set RECURRING_EVENTS_SCHEDULER_ENABLED=true to enable)')
            return
        }

        if (!this.schedulerToken) {
            console.error('Recurring Events Scheduler: RECURRING_EVENTS_SCHEDULER_TOKEN not set. Scheduler will not start.')
            return
        }

        if (!cron.validate(this.cronExpression)) {
            console.error(`Recurring Events Scheduler: Invalid cron expression: ${this.cronExpression}`)
            return
        }

        try {
            this.task = cron.schedule(this.cronExpression, async () => {
                await this.executeSyncAll()
            })

            console.log(`Recurring Events Scheduler: STARTED with schedule "${this.cronExpression}"`)
            console.log(`Recurring Events Scheduler: Next run will sync all recurring event configurations`)
        } catch (error) {
            console.error('Recurring Events Scheduler: Failed to start:', error)
        }
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.task) {
            this.task.stop()
            console.log('Recurring Events Scheduler: STOPPED')
        }
    }

    /**
     * Execute the sync-all operation
     */
    async executeSyncAll() {
        console.log('Recurring Events Scheduler: Starting scheduled sync...')

        try {
            const response = await axios.post(
                this.apiUrl,
                {},
                {
                    headers: {
                        'x-scheduler-token': this.schedulerToken
                    },
                    timeout: 300000 // 5 minute timeout
                }
            )

            if (response.data.success) {
                const summary = response.data.summary
                console.log(`Recurring Events Scheduler: SUCCESS - Configs: ${summary.totalConfigs}, Created: ${summary.totalCreated}, Updated: ${summary.totalUpdated}, Skipped: ${summary.totalSkipped}, Errors: ${summary.totalErrors}`)
            } else {
                console.error('Recurring Events Scheduler: Sync failed:', response.data.error)
            }
        } catch (error) {
            console.error('Recurring Events Scheduler: Error during scheduled sync:', error.message)
            if (error.response) {
                console.error('Recurring Events Scheduler: Response error:', error.response.data)
            }
        }
    }

    /**
     * Manually trigger a sync (useful for testing)
     */
    async triggerManualSync() {
        console.log('Recurring Events Scheduler: Manual sync triggered')
        await this.executeSyncAll()
    }
}

// Create singleton instance
const scheduler = new RecurringEventsScheduler()

module.exports = scheduler
