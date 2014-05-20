(function (angular) {
  "use strict";
  angular.module('SoundCloudRadio.main', ['ngRoute', 'SoundCloudRadio.main.note'])
  .config(function ($routeProvider, $locationProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'main/main.tpl.html',
        controller: 'MainController'
      })
      .when('/server', {
        templateUrl: 'server/server.tpl.html',
        controller: 'ServerController'
      })
      .when('/stats', {
        templateUrl: 'stats/stats.tpl.html',
        controller: 'StatsController'
      })
      .when('/radio', {
        templateUrl: 'radio/radio.tpl.html',
        controller: 'RadioController'
      })
      .otherwise({
        redirectTo: '/'
      });
  })
  .controller('MainController', function ($scope, $http, $q) {

    $scope.newRequest = '';
    $scope.progress = '';
    $scope.CLIENT_API_KEY = 'f1b510d0104aa451ffa6a5b998475988';
    $scope.tracks = {};
    $scope.queryTrack = '';
    var tracks = [];
    $scope.trackUi;

    var cache = {};
    var trackMetadata = {};
    var masterTrackId;

    var parseRequest = function(request){

      if(request.indexOf('api') !== -1){
        return request + '.json?client_id=f1b510d0104aa451ffa6a5b998475988';
      } else if(request.indexOf('http') !== -1){
        return 'http://api.soundcloud.com/resolve.json?url=' + request + '&client_id=f1b510d0104aa451ffa6a5b998475988';
      } else {
        return 'http://api.soundcloud.com' + request + '.json?client_id=f1b510d0104aa451ffa6a5b998475988';
      }
    };

    var initialize = function(){
      $scope.newRequest = '';
      $scope.progress = '';
      $scope.queryTrack = '';
      $scope.tracks = {};
      tracks = [];
      $scope.trackUi = [];
    };

    $scope.retrieve = function(){
      var getRequest = parseRequest($scope.newRequest);
      initialize();
      $scope.newRequest = '';
      $scope.progress = 'Submitting Request';
      $http.get(getRequest)
      .success(function(data){
        var trackId = data.id;
        if(cache[trackId] !== undefined){
          initialize();
          $scope.trackUi = cache[trackId];
          $scope.queryTrack = data.title;
          return;
        }
        masterTrackId = trackId;
        $scope.queryTrack = data.title;
        $scope.progress = 'Fetching Data for ' + $scope.queryTrack;
        var queryString = '/tracks/' + trackId + '/favoriters';

        $http.get(parseRequest(queryString))
        .success(function(data){
          $scope.progress = 'Creating Suggestion List for ' + $scope.queryTrack;
          var promises = [];
          for(var i = 0; i < data.length; i++){
            var userId = data[i].id;
            var queryString = '/users/' + userId + '/favorites';
            promises.push($http.get(parseRequest(queryString)));
          }

          $q.all(promises).then(function(results){
            angular.forEach(results, function(result){
              var song = result.data;
              for(var j = 0; j < song.length; j++){
                var trackId = song[j].id;
                var trackTitle = song[j].title;
                var trackUrl = song[j].permalink_url;
                trackMetadata[trackId] = {
                  title: trackTitle,
                  url: trackUrl
                };
                $scope.tracks[trackId] ? $scope.tracks[trackId]++ : $scope.tracks[trackId] = 1;
              }
            });
            $scope.parseTracks();
          });

        });
      });
    };

    $scope.parseTracks = function(){
      for(var key in $scope.tracks){
        if($scope.tracks[key] > 4) tracks.push([key, $scope.tracks[key], trackMetadata[key].title, trackMetadata[key].url]);
      }
      tracks.sort(function(a,b){
        return b[1] - a[1];
      });
      tracks.splice(0, 1);
      $scope.progress = '';
      cache[masterTrackId] = tracks;
      $scope.trackUi = tracks;
    };

  })
  .controller('ServerController', function($scope, $http, $q){
    $scope.test = 'Server Controller';
    $scope.retrieve = function(){
      var newRequest = $scope.newRequest;
      $scope.newRequest = '';
      $scope.progress = 'Fetching Suggestions'
      $scope.trackUi = [];
      $http.get('/' + newRequest).then(function(data){
        $scope.trackUi = data.data.results;
        $scope.progress = '';
        $scope.queryTrack = data.data.track;
      });
    };
  })
  .controller('StatsController', function($scope, $http, $q){
    $http.get('/top100').then(function(data){
      $scope.trackUi = [];
      var songs = data.data.results;
      $scope.trackUi = songs;
    });
  })
  .controller('RadioController', function($scope, $http, $q, $sce){
    var currentSong;
    var currentSongUri;
    var currentSongTitle;
    var parseRequest = function(request){
      if(request.indexOf('api') !== -1){
        return request + '.json?client_id=f1b510d0104aa451ffa6a5b998475988';
      } else if(request.indexOf('http') !== -1){
        return 'http://api.soundcloud.com/resolve.json?url=' + request + '&client_id=f1b510d0104aa451ffa6a5b998475988';
      } else {
        return 'http://api.soundcloud.com' + request + '.json?client_id=f1b510d0104aa451ffa6a5b998475988';
      }
    };

    var fetchSong = function(url){
      $http.get('/' + url).then(function(data){
        return data;
      });
    };


    $scope.getNextSong = function(){
      if(!currentSong){
        currentSong = $scope.newRequest;
        $scope.newRequest = '';
      }
      console.log(currentSong);
      $http.get('/' + currentSong).then(function(data){
        var deferred = $q.defer();
        deferred.resolve(data); 
        return deferred.promise;
      }).then(function(data){
        console.log(data);
        return $http.get(parseRequest(data.data.results[1].url));
      }).then(function(data){
        var deferred = $q.defer();
        deferred.resolve(data.data);
        return deferred.promise;
      }).then(function(data){
        currentSong = data.permalink_url;
        currentSongUri = data.uri;
        currentSongTitle = data.title;
        console.log(currentSong, currentSongUri, currentSongTitle);
        $scope.currentSongTitle = currentSongTitle;
        $scope.currentSongUri = $sce.trustAsResourceUrl(currentSongUri);
      });
    }
  });
}(angular));
