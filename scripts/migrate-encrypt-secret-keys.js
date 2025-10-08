#!/usr/bin/env node

/**
 * Migration script to encrypt existing Notion secret keys in the database
 *
 * This script:
 * 1. Loads all NotionRecurring documents
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

        // Fetch all NotionRecurring documents
        const documents = await NotionRecurringModel.find({});
        console.log(`Found ${documents.length} NotionRecurring documents`);

        let encryptedCount = 0;
        let alreadyEncryptedCount = 0;
        let errorCount = 0;

        for (const doc of documents) {
            try {
                // Check if already encrypted (encrypted format: iv:authTag:data)
                const isEncrypted = doc.secretKey && doc.secretKey.split(':').length === 3;

                if (isEncrypted) {
                    console.log(`Document ${doc._id}: Already encrypted, skipping`);
                    alreadyEncryptedCount++;
                    continue;
                }

                // Encrypt the secret key
                const encryptedKey = encryptionService.encrypt(doc.secretKey);

                // Update directly in MongoDB to bypass pre-save hook
                await NotionRecurringModel.updateOne(
                    { _id: doc._id },
                    { $set: { secretKey: encryptedKey } }
                );

                console.log(`Document ${doc._id}: Successfully encrypted`);
                encryptedCount++;
            } catch (error) {
                console.error(`Document ${doc._id}: Error - ${error.message}`);
                errorCount++;
            }
        }

        console.log('\nMigration Summary:');
        console.log(`Total documents: ${documents.length}`);
        console.log(`Newly encrypted: ${encryptedCount}`);
        console.log(`Already encrypted: ${alreadyEncryptedCount}`);
        console.log(`Errors: ${errorCount}`);

        // Close MongoDB connection
        await mongoose.connection.close();
        console.log('\nMongoDB connection closed');

        if (errorCount > 0) {
            process.exit(1);
        }

    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    }
}

// Run migration
migrateSecretKeys();
