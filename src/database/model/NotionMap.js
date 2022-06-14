var mongoose = require('mongoose');
var passport = require('passport');
var Schema = mongoose.Schema;

var NotionMapSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        default: 'Untitled'
    },
    secretKey: String,
    createdDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    modifiedDate: {
        type: Date,
        required: true,
        default: Date.now
    }
});

// Compile model from schema
var NotionMapModel = mongoose.model('Notion', NotionMapSchema);

module.exports = NotionMapModel