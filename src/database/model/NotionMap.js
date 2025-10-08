var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var { EncryptionService } = require('../../services/encryption-service');

var NotionMapSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    lastSyncedDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    title: {
        type: String,
        required: true,
        default: 'Untitled'
    },
    databaseId: String,
    secretKey: String,
    buildings: Object,   // TODO: in future, we can use a subdocument for strongly typed fields
    mapBounds: Object
});

// Initialize encryption service
let encryptionService;
try {
    if (!process.env.ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    encryptionService = new EncryptionService(process.env.ENCRYPTION_KEY);
} catch (error) {
    console.error('Failed to initialize encryption service:', error.message);
    throw error;
}

// Encrypt secretKey before saving
NotionMapSchema.pre('save', function(next) {
    // Only encrypt if secretKey has been modified and is not already encrypted
    if (this.isModified('secretKey') && this.secretKey) {
        // Check if it's already encrypted (encrypted format: iv:authTag:data)
        const isEncrypted = this.secretKey.split(':').length === 3;
        if (!isEncrypted) {
            try {
                this.secretKey = encryptionService.encrypt(this.secretKey);
            } catch (error) {
                return next(new Error(`Failed to encrypt secret key: ${error.message}`));
            }
        }
    }

    next();
});

// Add method to get decrypted secret key
NotionMapSchema.methods.getDecryptedSecretKey = function() {
    try {
        return encryptionService.decrypt(this.secretKey);
    } catch (error) {
        throw new Error(`Failed to decrypt secret key: ${error.message}`);
    }
};

// Compile model from schema
var NotionMapModel = mongoose.model('Notion', NotionMapSchema);

module.exports = NotionMapModel