var handler = require('./request-handler');
var Promise = require('bluebird');
var User = require('./models/user');
var Track = require('./models/track');

var findOneTrack = Promise.promisify(Track.findOne, Track);

var minPlays = 10000000;

var fetchTrack = function(){
  return new Promise(function(resolve, reject){
    findOneTrack({
      favoriters: { $size: 0 },
      plays: { $gt: minPlays }
    }).then(function(track){
      if(track === null){
        minPlays -= 50000;
        scrape(minPlays - 50000);
      } else {
        resolve(track);
      }
    });
  });
};

var scrape = function(){
  fetchTrack(minPlays)
  .then(function(track){
    console.log('##########################################################################');
    console.log('Fetching data for: ', track.title);
    console.log('Number of plays: ', track.plays);
    var array = track.url.split('');
    array.splice(5, 0 , 's');
    var queryUrl = array.join('');
    return handler.fetchSuggestionsInternal({url: '/' + queryUrl, scId: track.scId}, {send: function(){}});
  })
  .then(function(resolutionMessage){
    console.log('Fetch complete');
    minPlays += 50000;
    scrape(minPlays);
  });
};

var initialize = function(){
  minPlays = 3000000;
};

initialize();
scrape(3000000);