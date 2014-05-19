var db = require('./config');
var Promise = require('bluebird');
var User = require('./models/user');
var Track = require('./models/track');

var findTrack = Promise.promisify(Track.findOne, Track);
var request = Promise.promisify(require('request'));

var parseRequest = function(request){
  if(request.indexOf('api') !== -1){
    return request + '.json?client_id=f1b510d0104aa451ffa6a5b998475988';
  } else if(request.indexOf('http') !== -1){
    return 'http://api.soundcloud.com/resolve.json?url=' + request + '&client_id=f1b510d0104aa451ffa6a5b998475988';
  } else {
    return 'http://api.soundcloud.com' + request + '.json?client_id=f1b510d0104aa451ffa6a5b998475988';
  }
};

var parseLookupUrl = function(url){
  var temp = url.substring(url.indexOf('/'));
  return 'http:' + temp;
};

exports.renderIndex = function(req, res){
  res.sendFile('../../../client/index.html');
};

exports.fetchSuggestions = function(req, res){
  //Clean up the url a bit, remove https
  req.url = req.url.substring(1);
  console.log(parseLookupUrl(req.url));
  //Query database to see if this track is already there
  findTrack({url: parseLookupUrl(req.url)})
  .then(function(track){
    //If we don't have the track, enter promise hell to query the SoundCloud API and save it to the database
    if(track === null){
      console.log('track not found');
      return request({
        url: parseRequest(req.url),
        json: true
      }).then(function(data){
        var track = data[0].body;
        var newTrack = new Track;
        newTrack.url = track.permalink_url;
        newTrack.title = track.title;
        newTrack.scId = track.id;
        var save = Promise.promisify(newTrack.save, newTrack);
        return save().then(function(newTrack){
          return new Promise(function(resolve, reject){
            resolve(newTrack);
          })
        });
      });
    } else {
      return new Promise(function(resolve, reject){
        resolve(track);
      });
    }
  }).then(function(track){
    console.log(!!track);
  });

  res.send(200);
}