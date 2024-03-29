var db = require('../config');
var mongoose = require('mongoose');

var trackSchema = new mongoose.Schema({
  scId: Number,
  favoriters: [Number],
  url: String,
  title: String,
  plays: Number
});

var Track = mongoose.model('Track', trackSchema);

module.exports = Track;