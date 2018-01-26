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
        console.log("core.js got movesPlaces: " + success);
        $scope.movesPlaces = JSON.parse(success);
    }, function (error) {
        console.log('Error: ' + error);
    });
    

}

healthtrack.controller("mainController",mainController);

