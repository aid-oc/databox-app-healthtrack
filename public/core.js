var healthtrack = angular.module('healthtrack', []);


function mainController($scope, $http, $window) {
    $scope.formData = {};

    $scope.parseJson = function (json) {
    	let parsed = JSON.parse(json);
    	console.log("JSON Parsed: " + parsed);
    	return parsed;
    };

    $scope.addMarker = function (name, lat, lon) {
        if (!name) name = "Unknown";
        $window.L.marker([lat, lon], {
            title : name
        }).addTo($window.placesmap);
        // Focus on latest marker
        $window.placesmap.setView([lat, lon], 13);
    };


    // On controller load get movesPlaces
    $http.get('/databox-app-healthtrack/ui/api/movesPlaces').then(function (success) {
        console.log(success);
        $scope.movesPlaces = JSON.parse(JSON.stringify(success.data));
    }, function (error) {
        console.log('Error: ' + error);
    });
}



healthtrack.controller("mainController",mainController);

