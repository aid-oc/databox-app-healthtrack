var healthtrack = angular.module('healthtrack', []);

function mainController($scope, $http) {
    $scope.formData = {};

    $scope.parseJson = function (json) {
    	let parsed = JSON.parse(json);
    	console.log("JSON Parsed: " + parsed);
    	return parsed;
    }

    // On controller load get movesPlaces
    $http.get('/databox-app-healthtrack/ui/api/movesPlaces').then(function (success) {
        $scope.movesPlacesString = JSON.stringify(success);
        console.log($scope.movesPlacesString);
        $scope.movesPlaces = JSON.parse(success);
    }, function (error) {
        console.log('Error: ' + error);
    });
    

}

healthtrack.controller("mainController",mainController);

