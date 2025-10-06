var mongoose = require('mongoose');
var Schema = mongoose.Schema;

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

// Compile model from schema
var NotionMapModel = mongoose.model('Notion', NotionMapSchema);

module.exports = NotionMapModel