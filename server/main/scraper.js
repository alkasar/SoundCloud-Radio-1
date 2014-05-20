var handler = require('./request-handler');
var Promise = require('bluebird');
var User = require('./models/user');
var Track = require('./models/track');

var findOneTrack = Promise.promisify(Track.findOne, Track);

var fetchTrack = function(minPlays){
  return new Promise(function(resolve, reject){
    findOneTrack({
      favoriters: { $size: 0 },
      plays: { $gt: minPlays }
    }).then(function(track){
      if(track === null){
        scrape(minPlays - 50000);
      } else {
        resolve(track);
      }
    });
  });
};

var scrape = function(minPlays){
  fetchTrack(minPlays)
  .then(function(track){
    var array = track.url.split('');
    array.splice(5, 0 , 's');
    var queryUrl = array.join('');
    handler.fetchSuggestions({url: '/' + queryUrl}, {send: function(){}});
  })
  .then(function(){
    console.log('complete');
  });
};

scrape(10000000);