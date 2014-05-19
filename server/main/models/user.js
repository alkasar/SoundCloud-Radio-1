var db = require('../config');
var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
  scId: Number,
  favorites: [Number]
});

var User = mongoose.model('User', userSchema);

module.exports = User;