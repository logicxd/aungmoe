var database = require('../database')
var mongoose = require('mongoose');
var passport = require('passport');
var Schema = mongoose.Schema;

var BookmarkSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  website: {
    type: Schema.Types.ObjectId, 
    ref: 'Website',
    required: true
  },
  title: {
    type: String,
    required: true,
    unique: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  lastReadTitle: {
    type: String, 
    required: true
  },
  lastReadUrl: {
    type: String,
    required: true
  },
  nextChapterTitle: String,
  nextChapterUrl: String,
  nextChapterCheckedOn: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    required: true,
    enum : ['webtoon','novel'],
    default: 'webtoon'
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
  }
});

BookmarkSchema.path('imageUrl').validate(database.urlValidator, 'Invalid image url');
BookmarkSchema.path('lastReadUrl').validate(database.urlValidator, 'Invalid last read url');
BookmarkSchema.path('nextChapterUrl').validate(database.urlValidator, 'Invalid next chapter url');

// Compile model from schema
var BookmarkModel = mongoose.model('Bookmark', BookmarkSchema);

module.exports = BookmarkModel