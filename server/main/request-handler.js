var db = require('./config');
var User = require('./models/user');
var Track = require('./models/track');

exports.renderIndex = function(req, res){
  res.sendFile('../../../client/index.html');
};

exports.fetchSuggestions = function(req, res){
  res.send(req.url);
}