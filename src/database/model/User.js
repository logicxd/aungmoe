var mongoose = require('mongoose');
var passport = require('passport');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minLength: [6, 'Must be 6 or more characters'],
    maxLength: [20, 'Must be less than or equal to 20 characters'],
  }, 
  // Not needed since we're using passport-local-mongoose
  // password: { 
  //   type: String,
  //   required: true,
  //   minLength: [8, 'Must be 8 or more characters'],
  //   maxLength: [64, 'Must be less than or equal to 64 characters'],
  // },
  fullName: {
    type: String,
    required: true,
    minLength: [2, 'Must be 2 or more characters'],
    maxLength: [16, 'Must be less than or equal to 16 characters'],
  }, 
  createdDate: {
    type: Date,
    default: Date.now
  },
  lastLoginDate: {
    type: Date,
    default: Date.now
  }
});

// Use passport-local-mongoose
var passportLocalMongoose = require('passport-local-mongoose');
UserSchema.plugin(passportLocalMongoose)

// Compile model from schema
var UserModel = mongoose.model('User', UserSchema);

// Register user model
var LocalStrategy = require('passport-local').Strategy;
passport.use(new LocalStrategy(UserModel.authenticate()));
passport.serializeUser(UserModel.serializeUser());
passport.deserializeUser(UserModel.deserializeUser());

module.exports = UserModel