var healthtrack = angular.module('healthtrack', []);


function mainController($scope, $http, $window) {
    $scope.formData = {};

    $scope.parseJson = function (json) {
    	let parsed = JSON.parse(json);
    	console.log("JSON Parsed: " + parsed);
    	return parsed;
    };

    $scope.addMarker = function (name, lat, lon, start, end) {
        if (!name) name = "Unknown";
        // Generate random average HR (testing, will be replaced by driver data)
        let testHR = generateRandom(60, 101);
        // Marker values based on HR
        let markerIcon = "";
        $window.L.AwesomeMarkers.Icon.prototype.options.prefix = 'fa';
        // Classify colour based on HR
        switch (true) {
            case (testHR < 80):
                markerIcon = L.AwesomeMarkers.icon({
                    icon: 'heart-o',
                    markerColor: 'green'
                  });
                break;
            case (testHR >= 80 && testHR < 90):
                markerIcon = L.AwesomeMarkers.icon({
                    icon: 'heart',
                    markerColor: 'orange'
                  });
                break;
            case (testHR >= 90):
                markerIcon = L.AwesomeMarkers.icon({
                    icon: 'heartbeat',
                    markerColor: 'red'
                  });
                break;
            default:
                markerIcon = L.AwesomeMarkers.icon({
                    icon: 'heart-o',
                    markerColor: 'green'
                  });
                break;
        }   
        // Calculate time spent
        let startTime = moment(start);
        let endTime = moment(end);
        let difference = endTime.diff(startTime, 'hours', true);
        // Last visited
        let timeSince = endTime.fromNow();
        // Create marker     
        $window.L.marker([lat, lon], {
            title : name,
            icon  : markerIcon
        }).bindTooltip('You have a average HR of ' + testHR + ' at ' + name + "</br>" + "Last Visited: " + timeSince + "</br>" + "Time spent here: " + difference).addTo($window.placesmap);
        // Focus on latest marker
        $window.placesmap.setView([lat, lon], 13);
    };

    var generateRandom = function (min, max) {
        return Math.round(Math.random() * (max-min) + min);
    }

    // On controller load get movesPlaces
    $http.get('/databox-app-healthtrack/ui/api/movesPlaces').then(function (success) {
        $scope.movesPlaces = JSON.parse(JSON.stringify(success.data));
    }, function (error) {
        console.log('Error: ' + error);
    });
}



healthtrack.controller("mainController",mainController);

