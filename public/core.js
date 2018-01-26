var healthtrack = angular.module('healthtrack', []);

healthtrack.directive('scopeElement', function () {
    return {
        restrict:"A", // E-Element A-Attribute C-Class M-Comments
        replace: false,
        link: function($scope, elem, attrs) {
            $scope[attrs.scopeElement] = elem[0];
        }
    };
});

function mainController($scope, $http) {
    $scope.formData = {};

    $scope.parseJson = function (json) {
    	let parsed = JSON.parse(json);
    	console.log("JSON Parsed: " + parsed);
    	return parsed;
    }

    // On controller load get movesPlaces
    $http.get('/databox-app-healthtrack/ui/api/movesPlaces').then(function (success) {
        console.log(success);
        $scope.movesPlaces = JSON.parse(JSON.stringify(success.data));
    }, function (error) {
        console.log('Error: ' + error);
    });

    // Set up map
    $scope.placesmap.setView(([51.505, -0.09], 13));
}



healthtrack.controller("mainController",mainController);

