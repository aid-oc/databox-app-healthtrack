var healthtrack = angular.module('healthtrack', ['ngMaterial']);


function mainController($scope, $http, $window, $document, $mdDialog) {
    $scope.formData = {};

    $scope.monthlyFeedbackGiven = 0;
    $scope.activeZones = [];

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

    var downloadNames = new Promise(function(resolve, reject) {
        $http.get('/databox-app-healthtrack/ui/api/zoneNames').then(function(success) {
            console.log("Got Names: " + JSON.stringify(success.data));
            $scope.zoneNames = JSON.parse(JSON.stringify(success.data));
            resolve($scope.zoneNames);
        }, function(error) {
            console.log('Zone Names Request Error: ' + error);
            reject(error);
        });
    });

    $scope.calculateStats = function() {
        let totalHr;
        let maxHr;
        let minHr;
        let totalTimeSpent = 0;
        console.log("Calculating stats...");
        $scope.activeZones.sort(function(a,b) {
            return a.visits < b.visits;
        });
        for (var i = 0; i < $scope.activeZones.length; i++) {
            let currentZone = $scope.activeZones[i];
            if (i==0) {
                minHr = currentZone.hr;
                maxHr = currentZone.hr;
            } else {
                if (currentZone.hr > maxHr) maxHr = currentZone.hr;
                if (currentZone.hr < minhr) minHr = currentZone.hr;
            }
            totalHr += currentZone.hr;
            /*
            // Calculate time spent
            let startTime = moment(currentZone.start);
            let endTime = moment(currentZone.end);
            let difference = endTime.diff(startTime);
            $scope.totalTimeSpent += difference;
            */
        }
        // Calculate total time in days, mins, hours
        //$scope.trackedHours = moment(totalTimeSpent).asHours();
        //$scope.averageTimeSpent = monent($scope.totalTimeSpent / $scope.activeZones.length).asHours();
        $scope.averageHr = totalHr / $scope.activeZones.length;
        $scope.maxHr = maxHr;
        $scope.minHr = minHr;
        console.log("Most Visited Location: " + $scope.mostVisitedLocation );
    };

    // Event listener for a zone click
    var onMarkerClick = function(e) {
        let clickedMarker = e.target;
        let latLng = clickedMarker.getLatLng();
        var confirm = $mdDialog.prompt()
            .title('Zone Name')
            .textContent('Would you like to rename this zone?')
            .placeholder("Friend's House")
            .ariaLabel("Friend's House")
            .initialValue('')
            .required(true)
            .ok('Okay')
            .cancel('Cancel');

        $mdDialog.show(confirm).then(function(result) {
            $scope.renameZone(latLng.lat, latLng.lng, result);
        }, function() {
            console.log("Zone Rename cancelled");
        });

    };

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
        }).bindTooltip('You have a average HR of ' + hr + ' at ' + name + "</br>" + "Last Visited: " + timeSince + "</br>" + "Time spent here: " + difference).addTo($window.placesmap).on("click", onMarkerClick);
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
            $scope.tagZone(latLng.lat, latLng.lng, result);
        }, function() {
            console.log("Zone Feedback cancelled");
        });

    };

    $scope.addGroups = function(groups) {

        downloadTags.then((tags) => {

            downloadNames.then((names) => {
                    for (group in groups) {

                        let locationGroup = groups[group];
                        let rootLocation = locationGroup[0];
                        let groupHeartRate = locationGroup[0].heartRate;
                        let groupName = "";
                        let groupTag = "";
                        let groupColour = 'red';
                        let groupTagged = false;
                        let groupVisits = 0;
                        let mostRecentVisit = {};
                        // Check if this group/zone has been tagged with some feedback
                        for (var i = 0; i < tags.length; i++) {
                            let tag = tags[i];
                            if (tag.zoneLat.toFixed(8) === rootLocation.lat.toFixed(8) && tag.zoneLon.toFixed(8) === rootLocation.lon.toFixed(8)) {
                                groupTag = tag.zoneTag;
                                groupTagged = true;
                                groupColour = 'green';
                                $scope.monthlyFeedbackGiven++;
                            } else {
                            }
                        }
                        // Check if this group has a name override
                        for (var i = 0; i < names.length; i++) {
                            let name = names[i];
                            if (name.zoneLat.toFixed(8) === rootLocation.lat.toFixed(8) && name.zoneLon.toFixed(8) === rootLocation.lon.toFixed(8)) {
                                groupName = name.zoneName;
                            } else {
                            }
                        }
                        // Loop over group members, generate group name and find most recent visit
                        for (var i = 0; i < locationGroup.length; i++) {
                            groupVisits = locationGroup.length;
                            let currentLocation = locationGroup[i];
                            // Check if this is the most recent visit so far
                            if (angular.equals({}, mostRecentVisit) || mostRecentVisit.end < currentLocation.end) {
                                mostRecentVisit.start = currentLocation.start;
                                mostRecentVisit.end = currentLocation.end;
                            }
                            // Construct group name (append all different location names)
                            if (groupName === "" && currentLocation.name) {
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
                            fillColor: groupColour,
                            fillOpacity: 0.5,
                            radius: 120
                        }).bindTooltip('You have visited ' + locationGroup.length + ' locations in this area' + '</br>' + 'Feedback Provided: ' + groupTag).addTo($window.placesmap).on("click", onZoneClick);
                        // Add as an active zone
                        let zone = {
                            name : groupName,
                            lat  : rootLocation.lat,
                            lon  : rootLocation.lon,
                            start : mostRecentVisit.start,
                            end  : mostRecentVisit.end,
                            hr : groupHeartRate,
                            visits : groupVisits
                        };
                        $scope.activeZones.push(zone);
                        // Generate group HR marker
                        $scope.addMarker(groupName, rootLocation.lat, rootLocation.lon, mostRecentVisit.start, mostRecentVisit.end, groupHeartRate);
                    }
                    $scope.calculateStats();
                })
                .catch((err) => {

                });
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

    // Ask server to tag a zone and store
    $scope.renameZone = function(zoneLat, zoneLon, zoneName) {
        let postData = {
            lat: zoneLat,
            lon: zoneLon,
            name: zoneName
        };
        $http.post('/databox-app-healthtrack/ui/api/renameZone', postData).then(function(success) {
            console.log("Posted Name Request Successful: " + success);
        }, function(error) {
            console.log("Posted Name Request Error: " + error);
        });
    };

    $scope.downloadGroups = function() {
        // On controller load get groups
        $http.get('/databox-app-healthtrack/ui/api/locationGroups').then(function(success) {
            $scope.locationGroups = JSON.parse(JSON.stringify(success.data));
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