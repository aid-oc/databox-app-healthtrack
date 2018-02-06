var healthtrack = angular.module('healthtrack', []);


function mainController($scope, $http, $window, $document) {
    $scope.formData = {};

    $scope.parseJson = function (json) {
    	let parsed = JSON.parse(json);
    	console.log("JSON Parsed: " + parsed);
    	return parsed;
    };

    var generateRandom = function (min, max) {
        return Math.round(Math.random() * (max-min) + min);
    }

    $scope.addMarker = function (name, lat, lon, start, end) {
        if (!name) {
            name = "Unknown";
        }
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
        let difference = Math.round(endTime.diff(startTime, 'hours', true)) + " hours";
        // < 1 hour, display minutes
        if (difference < 0) {
            difference = Math.round(endTime.diff(startTime, 'minutes', true)) + " minutes";
        }
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

    $scope.addGroups = function(groups) {
        for (group in groups) {
            let locationGroup = JSON.parse(groups[group]);
            let rootLocation = locationGroup[0];
            let locationGroupName = "Unknown (Group)";
            for (location in locationGroup) {
                console.log(JSON.stringify(location));
                if (locationGroup[location].name) {
                    locationGroupName = locationGroup[location].name + " (Group)";
                }
            }

            let locationCircle = $window.L.circle([rootLocation.lat, rootLocation.lon], {
                color: 'red',
                fillColor: '#f03',
                fillOpacity: 0.5,
                radius: 15
            }).bindTooltip('You have visited ' + locationGroup.length + ' locations in the area of ' + locationGroupName).addTo($window.placesmap);

        }
    } 

    // On controller load get movesPlaces
    $http.get('/databox-app-healthtrack/ui/api/movesPlaces').then(function (success) {
        $scope.movesPlaces = JSON.parse(JSON.stringify(success.data));
    }, function (error) {
        console.log('Error: ' + error);
    });

    // On controller load get markers
    $http.get('/databox-app-healthtrack/ui/api/locationMarkers').then(function (success) {
        console.log('Markers: ' + success);
    }, function (error) {
        console.log('Markers Error: ' + error);
    });

    $scope.downloadGroups = function() {
        // On controller load get groups
        $http.get('/databox-app-healthtrack/ui/api/locationGroups').then(function (success) {
            $scope.locationGroups = JSON.parse(JSON.stringify(success.data));
            $scope.addGroups($scope.locationGroups);
        }, function (error) {
            console.log('Groups Error: ' + error);
        });
    };

    $document.ready(function() {
        $scope.downloadGroups();
    });

}



healthtrack.controller("mainController",mainController);

