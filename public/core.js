var healthtrack = angular.module('healthtrack', ['ngMaterial']);


function mainController($scope, $http, $window, $document, $mdDialog) {
    $scope.formData = {};

    $scope.parseJson = function(json) {
        let parsed = JSON.parse(json);
        console.log("JSON Parsed: " + parsed);
        return parsed;
    };

    var downloadTags = new Promise(function(resolve, reject) {
        $http.get('/databox-app-healthtrack/ui/api/zoneTags').then(function(success) {
            console.log("Got Tags: " + JSON.stringify(success.data));
            $scope.zoneTags = JSON.parse(JSON.stringify(success.data));
            resolve($scope.zoneTags);
        }, function(error) {
            console.log('Zone Tags Request Error: ' + error);
            reject(error);
        });
    });

    $scope.addMarker = function(name, lat, lon, start, end, hr) {
        if (!name) {
            name = "Unknown";
        }
        // Marker values based on HR
        let markerIcon = "";
        $window.L.AwesomeMarkers.Icon.prototype.options.prefix = 'fa';
        // Classify colour based on HR
        switch (true) {
            case (hr < 80):
                markerIcon = L.AwesomeMarkers.icon({
                    icon: 'heart-o',
                    markerColor: 'green'
                });
                break;
            case (hr >= 80 && hr < 90):
                markerIcon = L.AwesomeMarkers.icon({
                    icon: 'heart',
                    markerColor: 'orange'
                });
                break;
            case (hr >= 90):
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
        if (difference < 1) {
            difference = Math.round(endTime.diff(startTime, 'minutes', true)) + " minutes";
        }
        // Last visited
        let timeSince = endTime.fromNow();
        // Create marker     
        $window.L.marker([lat, lon], {
            title: name,
            icon: markerIcon
        }).bindTooltip('You have a average HR of ' + hr + ' at ' + name + "</br>" + "Last Visited: " + timeSince + "</br>" + "Time spent here: " + difference).addTo($window.placesmap);
        // Focus on latest marker
        $window.placesmap.setView([lat, lon], 13);
    };

    // Event listener for a zone click
    var onZoneClick = function(e) {
        let clickedCircle = e.target;
        let latLng = clickedCircle.getBounds().getCenter();

        var confirm = $mdDialog.prompt()
            .title('Zone Feedback')
            .textContent('Please provide as much information about how you felt during your visit to this area as possible.')
            .placeholder('What happened?')
            .ariaLabel('What happened?')
            .initialValue('')
            .required(true)
            .ok('Okay')
            .cancel('Cancel');

        $mdDialog.show(confirm).then(function(result) {
            console.log("Zone Feedback: " + result);
            $scope.tagZone(latLng.lat, latLng.lng, result);
        }, function() {
            console.log("Zone Feedback cancelled");
        });


    };

    $scope.addGroups = function(groups) {

        downloadTags.then((tags) => {
            

            for (group in groups) {

                let locationGroup = groups[group];
                let rootLocation = locationGroup[0];
                let groupHeartRate = locationGroup[0].heartRate;
                let groupName = "";
                let groupTag = "";
                let groupColour = 'red';
                let groupTagged = false;
                let mostRecentVisit = {};

                // Check if this group/zone has been tagged with some feedback
                for (var i = 0; i < tags.length; i++) {
                    let tag = tags[i];
                    if (tag.zoneLat === rootLocation.lat && tag.zoneLon === rootLocation.lon) {
                        groupTag = tag.zoneTag;
                        groupTagged = true;
                        groupColour = 'green';
                        $scope.monthlyFeedbackNeeded--;
                    }
                }

                // Loop over group members, generate group name and find most recent visit
                for (var i = 0; i < locationGroup.length; i++) {
                    let currentLocation = locationGroup[i];
                    // Check if this is the most recent visit so far
                    if (angular.equals({}, mostRecentVisit) || mostRecentVisit.end < currentLocation.end) {
                        mostRecentVisit.start = currentLocation.start;
                        mostRecentVisit.end = currentLocation.end;
                    }
                    // Construct group name (append all different location names)
                    if (currentLocation.name) {
                        if (!(groupName.trim() === currentLocation.name.trim())) {
                            if (groupName === "") {
                                groupName += currentLocation.name;
                            } else if (groupName.indexOf(currentLocation.name) !== -1) {
                                groupName += ", " + currentLocation.name;
                            }
                        }
                    }
                }
                // Generate group zone
                let locationCircle = $window.L.circle([rootLocation.lat, rootLocation.lon], {
                    color: groupColour,
                    fillColor: '#f03',
                    fillOpacity: 0.5,
                    radius: 120
                }).bindTooltip('You have visited ' + locationGroup.length + ' locations in this area' + '</br>' + 'Feedback Provided: ' + groupTag).addTo($window.placesmap).on("click", onZoneClick);
                // Generate group HR marker
                $scope.addMarker(groupName, rootLocation.lat, rootLocation.lon, mostRecentVisit.start, mostRecentVisit.end, groupHeartRate);
            }
        }).catch((err) => {
            console.log("Tag Loop Err: " + err);
        });
    };

    // Ask server to tag a zone and store
    $scope.tagZone = function(zoneLat, zoneLon, zoneTag) {
        let postData = {
            lat: zoneLat,
            lon: zoneLon,
            tag: zoneTag
        };
        $http.post('/databox-app-healthtrack/ui/api/tagZone', postData).then(function(success) {
            console.log("Posted Tag Request Successful: " + success);
        }, function(error) {
            console.log("Posted Tag Request Error: " + error);
        });
    };

    $scope.downloadGroups = function() {
        // On controller load get groups
        $http.get('/databox-app-healthtrack/ui/api/locationGroups').then(function(success) {
            $scope.locationGroups = JSON.parse(JSON.stringify(success.data));
            $scope.monthlyGroups = $scope.locationGroups.length;
            // TODO Add check here when possible against a feedback store for zones
            $scope.monthlyFeedbackNeeded = $scope.locationGroups.length;
            $scope.addGroups($scope.locationGroups);
        }, function(error) {
            console.log('Groups Error: ' + error);
        });
    };

    $document.ready(function() {
        $scope.downloadGroups();
    });

    // On controller load get movesPlaces
    $http.get('/databox-app-healthtrack/ui/api/movesPlaces').then(function(success) {
        $scope.movesPlaces = JSON.parse(JSON.stringify(success.data));
    }, function(error) {
        console.log('Error: ' + error);
    });

    // On controller load get markers
    $http.get('/databox-app-healthtrack/ui/api/locationMarkers').then(function(success) {
        console.log('Markers: ' + success);
    }, function(error) {
        console.log('Markers Error: ' + error);
    });
};



healthtrack.controller("mainController", mainController);