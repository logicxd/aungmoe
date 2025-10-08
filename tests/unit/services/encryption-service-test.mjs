import { describe, it, expect, beforeEach } from 'vitest'
import { EncryptionService } from '../../../src/services/encryption-service.js'

describe('EncryptionService', () => {
    let encryptionService
    const testKey = 'test-encryption-key-12345'
    const plainText = 'secret_ntn_12345abcdef'

    beforeEach(() => {
        encryptionService = new EncryptionService(testKey)
    })

    describe('constructor', () => {
        it('should throw error when encryption key is not provided', () => {
            expect(() => new EncryptionService()).toThrow('Encryption key is required')
        })

        it('should throw error when encryption key is empty', () => {
            expect(() => new EncryptionService('')).toThrow('Encryption key is required')
        })

        it('should create instance with valid key', () => {
            expect(encryptionService).toBeDefined()
            expect(encryptionService.algorithm).toBe('aes-256-gcm')
        })
    })

    describe('encrypt', () => {
        it('should throw error when plain text is empty', () => {
            expect(() => encryptionService.encrypt('')).toThrow('Plain text is required for encryption')
        })

        it('should throw error when plain text is null', () => {
            expect(() => encryptionService.encrypt(null)).toThrow('Plain text is required for encryption')
        })

        it('should encrypt plain text and return formatted string', () => {
            const encrypted = encryptionService.encrypt(plainText)

            expect(encrypted).toBeDefined()
            expect(typeof encrypted).toBe('string')

            // Check format: iv:authTag:encryptedData
            const parts = encrypted.split(':')
            expect(parts).toHaveLength(3)
            expect(parts[0]).toHaveLength(24) // 12 bytes = 24 hex chars
            expect(parts[1]).toHaveLength(32) // 16 bytes = 32 hex chars
            expect(parts[2].length).toBeGreaterThan(0)
        })

        it('should produce different encrypted values for same input (due to random IV)', () => {
            const encrypted1 = encryptionService.encrypt(plainText)
            const encrypted2 = encryptionService.encrypt(plainText)

            expect(encrypted1).not.toBe(encrypted2)
        })
    })

    describe('decrypt', () => {
        it('should throw error when encrypted text is empty', () => {
            expect(() => encryptionService.decrypt('')).toThrow('Encrypted text is required for decryption')
        })

        it('should throw error when encrypted text is null', () => {
            expect(() => encryptionService.decrypt(null)).toThrow('Encrypted text is required for decryption')
        })

        it('should throw error for invalid encrypted text format', () => {
            expect(() => encryptionService.decrypt('invalid-format')).toThrow('Invalid encrypted text format')
        })

        it('should decrypt encrypted text back to original', () => {
            const encrypted = encryptionService.encrypt(plainText)
            const decrypted = encryptionService.decrypt(encrypted)

            expect(decrypted).toBe(plainText)
        })

        it('should throw error when decrypting with wrong key', () => {
            const encrypted = encryptionService.encrypt(plainText)
            const wrongKeyService = new EncryptionService('wrong-key')

            expect(() => wrongKeyService.decrypt(encrypted)).toThrow('Decryption failed')
        })

        it('should throw error when encrypted text is tampered', () => {
            const encrypted = encryptionService.encrypt(plainText)
            // Tamper with the encrypted data
            const parts = encrypted.split(':')
            const tampered = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -4)}abcd`

            expect(() => encryptionService.decrypt(tampered)).toThrow('Decryption failed')
        })
    })

    describe('encrypt and decrypt integration', () => {
        it('should handle special characters', () => {
            const specialText = 'secret_!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`'
            const encrypted = encryptionService.encrypt(specialText)
            const decrypted = encryptionService.decrypt(encrypted)

            expect(decrypted).toBe(specialText)
        })

        it('should handle unicode characters', () => {
            const unicodeText = 'secret_密码_🔐_パスワード'
            const encrypted = encryptionService.encrypt(unicodeText)
            const decrypted = encryptionService.decrypt(encrypted)

            expect(decrypted).toBe(unicodeText)
        })

        it('should handle long text', () => {
            const longText = 'secret_' + 'a'.repeat(1000)
            const encrypted = encryptionService.encrypt(longText)
            const decrypted = encryptionService.decrypt(encrypted)

            expect(decrypted).toBe(longText)
        })
    })
})
