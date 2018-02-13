var healthtrack = angular.module('healthtrack', ['ngMaterial']);


function mainController($scope, $http, $window, $document, $mdDialog, $q) {
    $scope.formData = {};

    $scope.monthlyFeedbackGiven = 0;
    $scope.mostVisitedLocation = "Not yet known";
    $scope.activeZones = [];

    $scope.parseJson = function(json) {
        let parsed = JSON.parse(json);
        console.log("JSON Parsed: " + parsed);
        return parsed;
    };

    /*
    var calculateStats = function() {

        let zones = $scope.activeZones;

        let totalHr = 0;
        let lowestHr = 200;
        let highestHr = 0;
        let totalTime = 0;
        let mostVisitCount = 0;
        let mostVisited = "";
        for (var i = 0; i < zones.length; i++) {
            let zone = zones[i];
            // Check if this zone has the highest/lowest hr value
            if (zone.hr < lowest) lowestHr = zone.hr;
            if (zone.hr > highest) highestHr = zone.hr;
            totalHr += zone.hr;
            // Keep track of total time spent
            totalTime += moment(zone.end).diff(moment(zone.start));
            // Check if this zone has been visited the most
            if (i == 0 || zone.visits > mostVisitCount) {
                mostVisited = zone.name;
            }
        }
        $scope.trackedHours = moment(totalTime).asHours() + " hours";
        $scope.maxHr = highestHr;
        $scope.minHr = lowestHr;
        $scope.averageHr = Math.round(totalHr / zones.length);
        $scope.mostVisitedLocation = mostVisited;
    };
    */

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



    // addGroups(tags, names, groups, places);

    var addGroups = function(tags, names, groups, places) {

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
                }
            }
            // Check if this group has a name override
            for (var i = 0; i < names.length; i++) {
                let name = names[i];
                if (name.zoneLat.toFixed(8) === rootLocation.lat.toFixed(8) && name.zoneLon.toFixed(8) === rootLocation.lon.toFixed(8)) {
                    groupName = name.zoneName;
                } else {}
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
                name: groupName,
                lat: rootLocation.lat,
                lon: rootLocation.lon,
                start: mostRecentVisit.start,
                end: mostRecentVisit.end,
                hr: groupHeartRate,
                visits: groupVisits
            };
            $scope.activeZones.push(zone);
            // Generate group HR marker
            $scope.addMarker(groupName, rootLocation.lat, rootLocation.lon, mostRecentVisit.start, mostRecentVisit.end, groupHeartRate);
        }
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

    let getTags = $http.get('/databox-app-healthtrack/ui/api/zoneTags');
    let getNames = $http.get('/databox-app-healthtrack/ui/api/zoneNames');
    let getGroups = $http.get('/databox-app-healthtrack/ui/api/locationGroups');
    let getPlaces = $http.get('/databox-app-healthtrack/ui/api/movesPlaces');

    $q.all([getTags, getNames, getGroups, getPlaces]).then((data) => {
            let tags = data[0].data;
            let names = data[1].data;
            let groups = data[2].data;
            let places = data[3].data;
            addGroups(tags, names, groups, places);
        })
        .catch((error) => {
            console.log("Error!: " + JSON.stringify(error));
        });

};


healthtrack.controller("mainController", mainController);