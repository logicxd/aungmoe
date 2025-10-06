var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var NotionRecurringSchema = new Schema({
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
    modifiedDate: {
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
    databaseId: {
        type: String,
        required: true
    },
    secretKey: {
        type: String,
        required: true
    }
});

// Update modifiedDate on save
NotionRecurringSchema.pre('save', function(next) {
    this.modifiedDate = new Date();
    next();
});

// Compile model from schema
var NotionRecurringModel = mongoose.model('NotionRecurring', NotionRecurringSchema);

module.exports = NotionRecurringModel;
