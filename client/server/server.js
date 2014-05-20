angular.module('SoundCloudRadio.main.server', ['ngRoute'])

.config(function ($routeProvider) {
  $routeProvider
    .when('/server', {
      templateUrl: 'server/server.tpl.html',
      controller: 'ServerController'
    });
})
.controller('ServerController', function ($scope) {
  $scope.test = 'It Works!';
});