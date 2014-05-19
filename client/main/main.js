(function (angular) {
  "use strict";
  angular.module('SoundCloudRadio.main', ['ngRoute', 'SoundCloudRadio.main.note'])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'main/main.tpl.html',
        controller: 'MainController'
      })
      .otherwise({
        redirectTo: '/'
      });
  })
  .controller('MainController', function ($scope) {
    $scope.things = [];
  });
}(angular));
