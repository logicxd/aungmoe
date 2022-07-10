var mongoose = require('mongoose');
var passport = require('passport');
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
    modifiedDate: {
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
    buildings: {
        type: Schema.Types.Array,
        required: true,
        default: []
    }
});

// Compile model from schema
var NotionMapModel = mongoose.model('Notion', NotionMapSchema);

module.exports = NotionMapModel