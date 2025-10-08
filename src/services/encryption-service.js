"use strict";

const crypto = require('crypto');

/**
 * Service for encrypting and decrypting sensitive data using AES-256-GCM
 */
class EncryptionService {
    constructor(encryptionKey) {
        if (!encryptionKey) {
            throw new Error('Encryption key is required');
        }

        // Ensure key is 32 bytes (256 bits) for AES-256
        this.encryptionKey = crypto.createHash('sha256')
            .update(String(encryptionKey))
            .digest();

        this.algorithm = 'aes-256-gcm';
        this.ivLength = 12; // in bytes. 96 bits recommended for GCM
        this.authTagLength = 16; // in bytes, aka 128 bits
    }

    /**
     * Encrypts a plain text string
     * @param {string} plainText - The text to encrypt
     * @returns {string} Encrypted text in format: iv:authTag:encryptedData (all hex encoded)
     */
    encrypt(plainText) {
        if (!plainText) {
            throw new Error('Plain text is required for encryption');
        }

        // Generate random IV for each encryption
        const iv = crypto.randomBytes(this.ivLength);

        // Create cipher
        const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

        // Encrypt the data
        let encrypted = cipher.update(plainText, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Get authentication tag
        const authTag = cipher.getAuthTag();

        // Return IV, auth tag, and encrypted data concatenated with colons
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }

    /**
     * Decrypts an encrypted string
     * @param {string} encryptedText - The encrypted text in format: iv:authTag:encryptedData
     * @returns {string} Decrypted plain text
     */
    decrypt(encryptedText) {
        if (!encryptedText) {
            throw new Error('Encrypted text is required for decryption');
        }

        try {
            // Split the encrypted text into components
            const parts = encryptedText.split(':');
            if (parts.length !== 3) {
                throw new Error('Invalid encrypted text format');
            }

            const iv = Buffer.from(parts[0], 'hex');
            const authTag = Buffer.from(parts[1], 'hex');
            const encryptedData = parts[2];

            // Create decipher
            const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
            decipher.setAuthTag(authTag);

            // Decrypt the data
            let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }
}

module.exports = { EncryptionService };
