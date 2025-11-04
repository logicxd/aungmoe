#!/usr/bin/env node
"use strict";

/**
 * Standalone script for syncing all Notion recurring events
 *
 * This script is designed to run as a Fly.io Scheduled Machine.
 * It connects directly to the database and processes all recurring event configurations.
 *
 * Environment Variables Required:
 * - MONGODB_URI: MongoDB connection string
 * - All other required environment variables from .env
 */

require('dotenv').config()
const mongoose = require('mongoose')
const NotionRecurringModel = require('../../../database/model/NotionRecurring')
const { RecurringEventsService } = require('../service/recurring-events-service')

async function syncAllRecurringEvents() {
    console.log('='.repeat(60))
    console.log('Scheduled Sync: Starting recurring events sync...')
    console.log('Time:', new Date().toISOString())
    console.log('='.repeat(60))

    try {
        // Connect to MongoDB
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI)
            console.log('Connected to MongoDB')
        }

        // Fetch all configurations
        const allConfigs = await NotionRecurringModel.find({})
        console.log(`Found ${allConfigs.length} recurring event configuration(s)`)

        if (allConfigs.length === 0) {
            console.log('No configurations to process. Exiting.')
            await cleanup()
            process.exit(0)
        }

        // Process each configuration
        const results = []
        let totalCreated = 0
        let totalUpdated = 0
        let totalSkipped = 0
        let totalErrors = []

        for (const config of allConfigs) {
            console.log(`\nProcessing: "${config.title}" (${config._id})`)
            console.log('-'.repeat(60))

            try {
                const decryptedSecretKey = config.getDecryptedSecretKey()
                const service = new RecurringEventsService(decryptedSecretKey, config.databaseId)
                const result = await service.processRecurringEvents(config.lastSyncedDate)

                // Update last synced date
                config.lastSyncedDate = new Date()
                await config.save()

                totalCreated += result.created
                totalUpdated += result.updated
                totalSkipped += result.skipped
                totalErrors.push(...result.errors)

                results.push({
                    configId: config._id.toString(),
                    title: config.title,
                    success: true,
                    created: result.created,
                    updated: result.updated,
                    skipped: result.skipped,
                    errors: result.errors
                })

                console.log(`✓ Success: Created ${result.created}, Updated ${result.updated}, Skipped ${result.skipped}`)
                if (result.errors.length > 0) {
                    console.log(`⚠ Errors (${result.errors.length}):`, result.errors)
                }
            } catch (error) {
                console.error(`✗ Error: ${error.message}`)
                console.error('Stack:', error.stack)

                results.push({
                    configId: config._id.toString(),
                    title: config.title,
                    success: false,
                    error: error.message || 'Unknown error'
                })
                totalErrors.push(`Config ${config._id}: ${error.message}`)
            }
        }

        // Print summary
        console.log('\n' + '='.repeat(60))
        console.log('SUMMARY')
        console.log('='.repeat(60))
        console.log(`Total Configurations: ${allConfigs.length}`)
        console.log(`Total Created: ${totalCreated}`)
        console.log(`Total Updated: ${totalUpdated}`)
        console.log(`Total Skipped: ${totalSkipped}`)
        console.log(`Total Errors: ${totalErrors.length}`)

        if (totalErrors.length > 0) {
            console.log('\nError Details:')
            totalErrors.forEach((err, idx) => {
                console.log(`  ${idx + 1}. ${err}`)
            })
        }

        console.log('='.repeat(60))
        console.log('Scheduled Sync: Completed successfully')
        console.log('='.repeat(60))

        await cleanup()
        process.exit(0)
    } catch (error) {
        console.error('\n' + '='.repeat(60))
        console.error('FATAL ERROR')
        console.error('='.repeat(60))
        console.error('Error:', error.message)
        console.error('Stack:', error.stack)
        console.error('='.repeat(60))

        await cleanup()
        process.exit(1)
    }
}

async function cleanup() {
    try {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close()
            console.log('\nDisconnected from MongoDB')
        }
    } catch (error) {
        console.error('Error during cleanup:', error.message)
    }
}

// Handle process signals
process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM signal. Cleaning up...')
    await cleanup()
    process.exit(0)
})

process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT signal. Cleaning up...')
    await cleanup()
    process.exit(0)
})

// Run the sync
syncAllRecurringEvents()
