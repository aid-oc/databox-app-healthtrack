var healthtrack = angular.module('healthtrack', []);

function mainController($scope, $http) {
    $scope.formData = {};

    // On controller load get movesPlaces
    $http.get('/databox-app-healthtrack/ui/api/movesPlaces').then(function (success) {
        console.log(success);
        $scope.movesPlaces = success;
    }, function (error) {
        console.log('Error: ' + error);
    });

    $scope.parseJson = function (json) {
    	return JSON.parse(json);
    }

}

healthtrack.controller("mainController",mainController);


