#!/usr/bin/env node

/**
 * Migration script to encrypt existing Notion secret keys in the database
 *
 * This script:
 * 1. Loads all NotionRecurring and NotionMap documents
 * 2. Checks if secretKey is already encrypted
 * 3. Encrypts unencrypted keys
 * 4. Saves back to database
 *
 * Usage: node scripts/migrate-encrypt-secret-keys.js
 */

"use strict";

require('dotenv').config();
const mongoose = require('mongoose');
const NotionRecurringModel = require('../src/database/model/NotionRecurring');
const NotionMapModel = require('../src/database/model/NotionMap');
const { EncryptionService } = require('../src/services/encryption-service');

async function migrateSecretKeys() {
    try {
        console.log('Starting secret key encryption migration...');

        // Connect to MongoDB
        const connectionString = process.env.MONGODB_BOOKMARK_CONNECTION_STRING;
        if (!connectionString) {
            throw new Error('MONGODB_BOOKMARK_CONNECTION_STRING not found in environment variables');
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(connectionString);
        console.log('Connected to MongoDB');

        // Initialize encryption service
        if (!process.env.ENCRYPTION_KEY) {
            throw new Error('ENCRYPTION_KEY not found in environment variables');
        }
        const encryptionService = new EncryptionService(process.env.ENCRYPTION_KEY);

        // Migrate NotionRecurring documents
        console.log('\n=== Migrating NotionRecurring documents ===');
        const recurringDocs = await NotionRecurringModel.find({});
        console.log(`Found ${recurringDocs.length} NotionRecurring documents`);

        let recurringStats = await migrateDocuments(
            recurringDocs,
            NotionRecurringModel,
            encryptionService,
            'NotionRecurring'
        );

        // Migrate NotionMap documents
        console.log('\n=== Migrating NotionMap documents ===');
        const mapDocs = await NotionMapModel.find({});
        console.log(`Found ${mapDocs.length} NotionMap documents`);

        let mapStats = await migrateDocuments(
            mapDocs,
            NotionMapModel,
            encryptionService,
            'NotionMap'
        );

        // Combined summary
        console.log('\n=== Overall Migration Summary ===');
        console.log(`Total documents: ${recurringStats.total + mapStats.total}`);
        console.log(`Newly encrypted: ${recurringStats.encrypted + mapStats.encrypted}`);
        console.log(`Already encrypted: ${recurringStats.alreadyEncrypted + mapStats.alreadyEncrypted}`);
        console.log(`Errors: ${recurringStats.errors + mapStats.errors}`);

        // Close MongoDB connection
        await mongoose.connection.close();
        console.log('\nMongoDB connection closed');

        if (recurringStats.errors + mapStats.errors > 0) {
            process.exit(1);
        }

    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    }
}

async function migrateDocuments(documents, Model, encryptionService, modelName) {
    let encryptedCount = 0;
    let alreadyEncryptedCount = 0;
    let errorCount = 0;

    for (const doc of documents) {
        try {
            // Skip documents without secretKey
            if (!doc.secretKey) {
                console.log(`${modelName} ${doc._id}: No secret key, skipping`);
                continue;
            }

            // Check if already encrypted (encrypted format: iv:authTag:data)
            const isEncrypted = doc.secretKey.split(':').length === 3;

            if (isEncrypted) {
                console.log(`${modelName} ${doc._id}: Already encrypted, skipping`);
                alreadyEncryptedCount++;
                continue;
            }

            // Encrypt the secret key
            const encryptedKey = encryptionService.encrypt(doc.secretKey);

            // Update directly in MongoDB to bypass pre-save hook
            await Model.updateOne(
                { _id: doc._id },
                { $set: { secretKey: encryptedKey } }
            );

            console.log(`${modelName} ${doc._id}: Successfully encrypted`);
            encryptedCount++;
        } catch (error) {
            console.error(`${modelName} ${doc._id}: Error - ${error.message}`);
            errorCount++;
        }
    }

    console.log(`\n${modelName} Summary:`);
    console.log(`Total: ${documents.length}`);
    console.log(`Newly encrypted: ${encryptedCount}`);
    console.log(`Already encrypted: ${alreadyEncryptedCount}`);
    console.log(`Errors: ${errorCount}`);

    return {
        total: documents.length,
        encrypted: encryptedCount,
        alreadyEncrypted: alreadyEncryptedCount,
        errors: errorCount
    };
}

// Run migration
migrateSecretKeys();
