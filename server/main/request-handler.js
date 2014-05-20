var db = require('./config');
var Promise = require('bluebird');
var User = require('./models/user');
var Track = require('./models/track');

var findTrack = Promise.promisify(Track.findOne, Track);
var findUser = Promise.promisify(User.findOne, User);
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
  var possiblyNewTracks = {}; //Save this in the closure scope for use later
  var suggestions = [];

  //Clean up the url a bit, remove https
  req.url = req.url.substring(1);
  //Query database to see if this track is already there
  findTrack({url: parseLookupUrl(req.url)})
  .then(function(track){

    if(track === null){

      return new Promise(function(resolve, reject){
        request({
          url: parseRequest(req.url),
          json: true
        }).then(function(data){
          var track = data[0].body;
          var newTrack = new Track;
          newTrack.url = track.permalink_url;
          newTrack.title = track.title;
          newTrack.scId = track.id;
          newTrack.plays = track.playback_count;
          var save = Promise.promisify(newTrack.save, newTrack);
          return save()
        }).then(function(track){
          resolve(track[0]);
        });
      });

    } else {
      return new Promise(function(resolve, reject){
        resolve(track);
      });
    }
  }).then(function(track){ //Now that we have the track, either push the favoriters forward or look them up
    if(track.favoriters.length === 0){ //This promise should return an array of user IDs
      
      return new Promise(function(resolve, reject){
        request({
          url: parseRequest('/tracks/' + track.scId + '/favoriters'),
          json: true
        }).then(function(data){
          var favoriters = data[0].body;
          for(var i = 0; i < favoriters.length; i++){
            track.favoriters.push(favoriters[i].id);
          };
          var save = Promise.promisify(track.save, track);
          return save();
        }).then(function(track){
          resolve(track[0].favoriters);
        });
      });

    } else {
      return new Promise(function(resolve, reject){
        resolve(track.favoriters);
      });
    }
  }).then(function(favoriters){ //Now we have an array of user IDs given to us. Ensure that each user is in the database and has an array of favorites.
    //Fulfill this promise with an object containing trackId and number of users who like that track.

    //Set up all of the promises
    var promises = [];
    var userIds = [];
    var userHolder = [];
    var insertionIds = [];

    for(var i = 0; i < favoriters.length; i++){
      var userId = favoriters[i];
      userIds.push(userId);
      promises.push(findUser({scId: userId}));
    }

    Promise.all(promises).then(function(users){
      return new Promise(function(resolve, reject){
        var promises = [];
        for(var i = 0; i < users.length; i++){
          if(users[i] === null){
            var newUser = new User;
            newUser.scId = userIds[i];
            var save = Promise.promisify(newUser.save, newUser);
            promises.push(save());
          } else {
            promises.push(users[i]);
          }
        };
        Promise.all(promises).then(function(users){
          resolve(users);
        });
      });
    }).then(function(users){ //Go through users, ensuring that they have favorites. If not, then HTTP get them!
      userHolder = users;
      return new Promise(function(resolve, reject){
        var promises = [];
        for(var i = 0; i < users.length; i++){
          if(Array.isArray(users[i])){
            users[i] = users[i][0];
          }
          if(users[i].favorites.length === 0){
            var queryString = '/users/' + users[i].scId + '/favorites';
            promises.push(request({
              url: parseRequest(queryString),
              json: true
            }));
          } else {
            promises.push(users[i]);
          }
        };
        Promise.all(promises).then(function(users){
          resolve(users);
        });
      });
    }).then(function(data){ //We have an array with some users and some objects with a body property
      var promises = [];
      return new Promise(function(resolve, reject){
        for(var i = 0; i < data.length; i++){
          //If favorites had to be added, data[i][0].body contains the list of favorites
          //If no favorites had to be added, data[i] is the user object itself
          var keys = Object.keys(data[i]);

          if(keys.indexOf('save') > -1){
            promises.push(userHolder[i]);
          } else {
            var temp = [];
            var favorites = data[i][0].body;
            for(var j = 0; j < favorites.length; j++){
              var track = favorites[j];
              var trackId = favorites[j].id;
              possiblyNewTracks[trackId] = {
                title: track.title,
                url: track.permalink_url,
                scId: trackId,
                plays: track.playback_count
              };
              temp.push(trackId);
            }
            userHolder[i].favorites = temp;
            var save = Promise.promisify(userHolder[i].save, userHolder[i]);
            promises.push(save());
          }
        }
        Promise.all(promises).then(function(users){
          resolve(users);
        });
      });
    }).then(function(users){ //FINALLY we have all the users who have favorited the track and their favorites. PARSE!!!!
      //If the user is already in the database, an array of arrays of users is returned
      //Else an object is returned
      var tracks = {};
      
      for(var i = 0; i < users.length; i++){
        if(typeof users[i][0] === 'undefined'){
          user = users[i];
        } else {
          user = users[i][0];
        }
        for(var j = 0; j < user.favorites.length; j++){
          var trackId = user.favorites[j];
          tracks[trackId] ? tracks[trackId]++ : tracks[trackId] = 1;
        }
      }
      for(var key in tracks){
        if(tracks[key] > 5){
          suggestions.push(key);
          suggestions.sort(function(a,b){
            return tracks[a] - tracks[b];
          });
        }
      }
      return new Promise(function(resolve, reject){
        resolve();
      });
    }).then(function(){ //We've saved the users and their favorites to the database, as well as their tracks. Now we need to save any tracks 
    //which aren't already in the db
      return new Promise(function(resolve, reject){
        var promises = [];
        var trackIds = Object.keys(possiblyNewTracks);
        for(var i = 0; i < trackIds.length; i++){
          insertionIds.push(trackIds[i]);
          promises.push(findTrack({scId: trackIds[i]}));
        }
        Promise.all(promises).then(function(data){
          resolve(data);
        });
      });
    }).then(function(data){
      return new Promise(function(resolve, reject){
        var promises = [];
        for(var i = 0; i < data.length; i++){
          if(data[i] === null){ //Then we need to save a new track to the database
            var newTrack = new Track(possiblyNewTracks[insertionIds[i]]);
            var save = Promise.promisify(newTrack.save, newTrack);
            promises.push(save());
          }
        }
        Promise.all(promises).then(function(data){
          resolve('promise called');
        });
      });
    }).then(function(data){ //Finally we fetch the metadata for all the trackIDs we have
      var promises = [];
      for(var i = 0; i < suggestions.length; i++){
        var trackId = suggestions[i];
        promises.push(findTrack({scId: trackId}));
      }
      Promise.all(promises).then(function(data){
        var results = [];
        for(var i = 0; i < data.length; i++){
          results.push({
            url: data[i].url,
            title: data[i].title,
            scId: data[i].scId,
            plays: data[i].plays
          });
        }
        console.log(results);
      });
    });

  });

  res.send(200);
}