var healthtrack = angular.module('healthtrack', []);

function mainController($scope, $http) {
    $scope.formData = {};

    // On page load get all healthpoint data
    $http.get('/api/movesPlaces')
        .success(function(data) {
            $scope.movesplaces = data;
            console.log(data);
        })
        .error(function(data) {
            console.log('Error: ' + data);
        });


    /* Used for testing, now use databox store data ^

    // On page load get all healthpoint data
    $http.get('/api/healthpoint')
        .success(function(data) {
            $scope.healthpoints = data;
            console.log(data);
        })
        .error(function(data) {
            console.log('Error: ' + data);
        });

    // Form submit, post form to API
    $scope.createHealthPoint = function() {
        $http.post('/api/healthpoint', $scope.formData)
            .success(function(data) {
                $scope.formData = {}; // Clear form data
                $scope.healthpoints = data; // New healthpoint set
                console.log(data);
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    // Delete a healthpoint by ID
    $scope.deleteHealthPoint = function(id) {
        $http.delete('/api/healthpoint/' + id)
            .success(function(data) {
                $scope.healthpoints = data;
                console.log(data);
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    */

}

healthtrack.controller("mainController",mainController);


