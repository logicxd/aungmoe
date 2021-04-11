var database = require('../database')
var mongoose = require('mongoose');
var passport = require('passport');
var Schema = mongoose.Schema;

var WebsiteSchema = new Schema({
  url: {
    type: String,
    required: true,
    unique: true
  },
  createdDate: {
    type: Date,
    required: true,
    default: Date.now
  }
});

WebsiteSchema.path('url').validate(database.urlValidator, 'Invalid URL.');

// Compile model from schema
var WebsiteModel = mongoose.model('Website', WebsiteSchema);

module.exports = WebsiteModel