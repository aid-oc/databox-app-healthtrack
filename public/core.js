var healthtrack = angular.module('healthtrack', []);

function mainController($scope, $http) {
    $scope.formData = {};

    $http.get('/databox-app-healthtrack/ui/api/movesPlaces').then(function (success) {
        console.log(success);
        $scope.movesplaces = success;
    }, function (error) {
        console.log('Error: ' + error);
    });

}

healthtrack.controller("mainController",mainController);


