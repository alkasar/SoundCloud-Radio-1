(function (angular) {
  "use strict";
  angular.module('SoundCloudRadio.main', ['ngRoute', 'SoundCloudRadio.main.note'])
  .config(function ($routeProvider, $locationProvider) {
    $locationProvider.html5Mode(true);
    $routeProvider
      .when('/', {
        templateUrl: 'main/main.tpl.html',
        controller: 'MainController'
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

  });
}(angular));
