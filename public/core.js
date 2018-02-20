var healthtrack = angular.module('healthtrack', ['ngMaterial', 'ui.bootstrap']);


function mainController($scope, $http, $window, $document, $mdDialog, $q) {
    $scope.formData = {};

    $scope.feedbackGroups = [];

    var zoneMarkers;
    var placeMarkers;

    $scope.clearLayers = function() {
        $window.placesmap.removeLayer(zoneMarkers);
        $window.placesmap.removeLayer(placeMarkers);
    };

    $scope.parseJson = function(json) {
        let parsed = JSON.parse(json);
        console.log("JSON Parsed: " + parsed);
        return parsed;
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

    var addMarker = function(name, lat, lon, start, end, hr) {
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
        // Last visited
        let timeSince = endTime.fromNow();
        // Create marker     
        let markerLayer = $window.L.marker([lat, lon], {
            title: name,
            icon: markerIcon
        }).bindTooltip('You have a average HR of ' + hr + ' at ' + name + "</br>" + "Last Visited: " + timeSince + "</br>" + "Time spent here: " + difference).on("click", onMarkerClick);
        placeMarkers.addLayer(markerLayer);
        // Focus on latest marker
        $window.placesmap.setView([lat, lon], 11);
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

    var addGroups = function(tags, names, groups) {

        zoneMarkers = new $window.L.FeatureGroup();
        placeMarkers = new $window.L.FeatureGroup();

        let feedbackGiven = 0;
        let totalTime = 0;
        let totalHr = 0;
        let maxHr = 0;
        let minHr = 200;

        for (group in groups) {
            // Current working group/group root
            let locationGroup = groups[group];
            let rootLocation = locationGroup[0];
            // Keep track of totals for all group (to be shared as scope variable)
            let groupHeartRate = locationGroup[0].heartRate;
            totalHr += groupHeartRate;
            if (groupHeartRate > maxHr) maxHr = groupHeartRate;
            if (groupHeartRate < minHr) minHr = groupHeartRate;
            // Group properties
            let groupName = "";
            let groupFeedback = [];
            let groupTag = "";
            let groupColour = 'red';
            let groupTagged = false;
            let groupVisits = 0;
            let mostRecentVisit = {};
            // Check if this group/zone has been tagged with some feedback
            for (var i = 0; i < tags.length; i++) {
                let tag = tags[i];
                if (tag.zoneLat.toFixed(8) === rootLocation.lat.toFixed(8) && tag.zoneLon.toFixed(8) === rootLocation.lon.toFixed(8)) {
                    if (!groupTagged) {
                        groupTag = tag.zoneTag;
                        groupTagged = true;
                        groupColour = 'green';
                        feedbackGiven++;
                    }
                    // Make date more readable, parse from JSON and format
                    tag.zoneTagDate = moment(tag.zoneTagDate).format("dddd, MMMM Do YYYY, h:mm a");
                    groupFeedback.push(tag);
                }
            }
            // Check if this group has a name override
            for (var i = 0; i < names.length; i++) {
                let name = names[i];
                if (name.zoneLat.toFixed(8) === rootLocation.lat.toFixed(8) && name.zoneLon.toFixed(8) === rootLocation.lon.toFixed(8)) {
                    groupName = name.zoneName;
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
            }).bindTooltip('You have visited ' + locationGroup.length + ' locations in this area' + '</br>' + 'Feedback Provided: ' + groupTag).on("click", onZoneClick);
            // Add to zone markers
            zoneMarkers.addLayer(locationCircle);
            // Add as an active zone
            let zone = {
                name: groupName,
                lat: rootLocation.lat,
                lon: rootLocation.lon,
                start: mostRecentVisit.start,
                end: mostRecentVisit.end,
                hr: groupHeartRate,
                visits: groupVisits,
                feedback: groupFeedback
            };
            $scope.feedbackGroups.push(zone);
            // Generate group HR marker
            addMarker(groupName, rootLocation.lat, rootLocation.lon, mostRecentVisit.start, mostRecentVisit.end, groupHeartRate);
        }

        // Add zone layer
        $window.placesmap.addLayer(zoneMarkers);
        // Add places layer
        $window.placesmap.addLayer(placeMarkers);

        $scope.maxHr = maxHr;
        $scope.minHr = minHr;
        $scope.averageHr = Math.round(totalHr / groups.length);
        $scope.feedbackGiven = feedbackGiven;
        $scope.totalGroups = groups.length;
        $scope.feedbackNeeded = groups.length - feedbackGiven;
    };

    // Ask server to tag a zone and store
    $scope.tagZone = function(zoneLat, zoneLon, zoneTag) {
        let postData = {
            date: moment().toJSON(),
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

    $scope.filterDaily = function() {
        // Clear map
        $scope.clearLayers();
        // Reset feedback
        $scope.feedbackGroups = [];
        // Copy groups, we want a new object here
        $scope.groupsToday = angular.copy($scope.groups);
        // Filter current groups to today's date
        let newGroups = $scope.groupsToday.filter(function (element) {
            console.log("Testing Element: " + element.start);
            return moment(element.start).isSame(new Date(), "day");
        });
        // Add new groups to the map
        addGroups($scope.tags, $scope.names, newGroups);
    };

    $scope.filterForFeedback = function(item) {
        return item.feedback.length > 0;
    };



    $http.get('/databox-app-healthtrack/ui/api/zones').then(function(success) {
        let data = JSON.parse(JSON.stringify(success.data));
        $scope.tags = data.tags;
        $scope.names = data.names;
        $scope.groups = data.groups;
        addGroups($scope.tags, $scope.names, $scope.groups);
    }, function(error) {
        console.log("Error!: " + error);
    });

}


healthtrack.controller("mainController", mainController);