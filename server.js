/// Dependencies
var express = require('express');
var app = express(); // Create Express App
var https = require('https');
var databox = require('node-databox');
var moment = require('moment');
var morgan = require('morgan'); // Logger
var bodyParser = require('body-parser'); // HTML Post Parsing
var methodOverride = require('method-override'); // Simulates DELETE/PUT
var geolib = require('geolib');
var async = require('async');

// Configure Application

app.use(express.static(__dirname + '/public')); // Static files location
app.use('/ui/static', express.static(__dirname + '/public'));
app.use('/ui/nm', express.static(__dirname + '/node_modules'));
app.use(morgan('dev')); // Logging to console
app.use(bodyParser.urlencoded({
    'extended': 'true'
})); // Parse encoded forms
app.use(bodyParser.json()); // Parse JSON
app.use(bodyParser.json({
    type: 'application/vnd.api+json'
})); // Parse vnd.api+json as json
app.use(methodOverride());

// Set up stores
const DATABOX_ZMQ_ENDPOINT = process.env.DATABOX_ZMQ_ENDPOINT;

var kvc = databox.NewKeyValueClient(DATABOX_ZMQ_ENDPOINT, false);

var kvctwo = databox.NewKeyValueClient(DATABOX_ZMQ_ENDPOINT, false);

// Set up data stores 

/* Handle zone tagging */
var healthtrackZoneTags = databox.NewDataSourceMetadata();
healthtrackZoneTags.Description = 'HealthTrack Zone Tags';
healthtrackZoneTags.ContentType = 'application/json';
healthtrackZoneTags.Vendor = 'psyao1';
healthtrackZoneTags.DataSourceType = 'healthtrackZoneTags';
healthtrackZoneTags.DataSourceID = 'healthtrackZoneTags';
healthtrackZoneTags.StoreType = 'kv';

/* Handle zone renaming */
var renamedGroups = databox.NewDataSourceMetadata();
renamedGroups.Description = 'HealthTrack Zone Renames';
renamedGroups.ContentType = 'application/json';
renamedGroups.Vendor = 'psyao1';
renamedGroups.DataSourceType = 'renamedGroups';
renamedGroups.DataSourceID = 'renamedGroups';
renamedGroups.StoreType = 'kv';

// Register Key-Value Store
kvc.RegisterDatasource(healthtrackZoneTags)
    .then(() => {
        console.log("Registered datasource: healthtrackZoneTags");
        return kvctwo.RegisterDatasource(renamedGroups);
    })
    .then(() => {
        console.log("Registered datasource: renamedGroups");
    })
    .catch((err) => {
        console.log("Error registering data source:" + err);
    });

var generateRandom = function(min, max) {
    return Math.round(Math.random() * (max - min) + min);
};

var emptyObject = function(obj) {
    return !Object.keys(obj).length;
}

var getPlacesFromStore = new Promise(function(resolve, reject) {
    let DATASOURCE_DS_movesPlaces = process.env.DATASOURCE_DS_movesPlaces;
    databox.HypercatToSourceDataMetadata(DATASOURCE_DS_movesPlaces)
        .then((data) => {
            let movesStream = {};
            let movesStore = null;
            databox.HypercatToSourceDataMetadata(process.env.DATASOURCE_DS_movesPlaces)
                .then((data) => {
                    movesStream = data
                    movesStore = databox.NewKeyValueClient(movesStream.DataSourceURL, false)
                    movesStore.Read('movesPlaces').then((res) => {
                        resolve(res);
                    }).catch((err) => {
                        reject({
                            "error": err
                        });
                    });
                });
        })
        .catch((err) => {
            reject(err);
        });
});


var getHeartRateFromStore = new Promise(function(resolve, reject) {
    let DATASOURCE_DS_fitbitHr = process.env.DATASOURCE_DS_fitbitHr;
    databox.HypercatToSourceDataMetadata(DATASOURCE_DS_fitbitHr)
        .then((data) => {
            let hrStream = {};
            let hrStore = null;
            databox.HypercatToSourceDataMetadata(process.env.DATASOURCE_DS_fitbitHr)
                .then((data) => {
                    hrStream = data;
                    hrStore = databox.NewKeyValueClient(hrStream.DataSourceURL, false);
                    hrStore.Read('fitbitHr').then((res) => {
                        resolve(res);
                    }).catch((err) => {
                        reject({
                            "error": err
                        });
                    });
                });
        })
        .catch((err) => {
            reject(err);
        });
});


/* Handles saving a tag to a zone (description against a zone identified by lat/long) */
app.post('/ui/api/tagZone', function(request, response) {

    let newTag = {
        zoneTagDate: request.body.date,
        zoneLat: request.body.lat,
        zoneLon: request.body.lon,
        zoneTag: request.body.tag
    };

    let datasourceId = "healthtrackZoneTags";

    kvc.Read(datasourceId).then((res) => {
        let currentContentArray = JSON.parse(JSON.stringify(res));
        if (emptyObject(currentContentArray)) {
            currentContentArray = [];
        }
        currentContentArray.push(newTag);
        // Write zonetag
        kvc.Write(datasourceId, currentContentArray).then((res) => {
            response.status(200).end();
        }).catch((err) => {
            response.status(500).end();
        });
    }).catch((err) => {
        console.log("Failed to read from tags: " + err);
        response.status(500).end();
    });
});

app.post('/ui/api/renameZone', function(request, response) {
    let newRename = {
        zoneLat: request.body.lat,
        zoneLon: request.body.lon,
        zoneName: request.body.name
    };
    let datasourceId = "renamedGroups";
    kvc.Read(datasourceId).then((res) => {
        let currentContentArray = JSON.parse(JSON.stringify(res));
        if (emptyObject(currentContentArray)) {
            currentContentArray = [];
        }
        currentContentArray.push(newRename);
        // Write zonetag
        kvc.Write(datasourceId, currentContentArray).then((res) => {
            response.status(200).end();
        }).catch((err) => {
            console.log("Error naming zone: " + err);
            response.status(500).end();
        });
    }).catch((err) => {
        console.log("Failed to read from names: " + err);
        response.status(500).end();
    });
});


app.get('/ui/api/zones', function(request, response) {

    async.parallel({
        tags: function(callback) {
            kvc.Read('healthtrackZoneTags').then((res) => {
                console.log("Read Store with datasourceId: healthtrackZoneTags");
                callback(null, res);
            }).catch((err) => {
                console.log("Error reading tags.." + err);
                callback(err, null);
            });
        },
        names: function(callback) {
            kvctwo.Read('renamedGroups').then((res) => {
                console.log("Read Store with datasourceId: renamedGroups");
                callback(null, res);
            }).catch((err) => {
                console.log("Error reading names...");
                callback(err, null);
            });
        },
        groups: function(callback) {
            let locationGroups = [];
            getPlacesFromStore.then((data) => {
                    let jsonString = JSON.stringify(data);
                    let json = JSON.parse(jsonString);
                    for (day in json) {
                        for (segment in json[day].segments) {
                            // Create marker
                            let marker = {};
                            let placeName = json[day].segments[segment].place.name;
                            marker.start = json[day].segments[segment].startTime;
                            marker.end = json[day].segments[segment].endTime;
                            marker.lat = json[day].segments[segment].place.location.lat;
                            marker.lon = json[day].segments[segment].place.location.lon;
                            marker.name = placeName;

                            // Check if any valid groups exist
                            if (locationGroups.length > 0) {
                                let groupFound = false;
                                // Loop over each group, check if this marker belongs
                                for (group in locationGroups) {
                                    let distance = geolib.getDistance({
                                        latitude: marker.lat,
                                        longitude: marker.lon
                                    }, {
                                        latitude: locationGroups[group][0].lat,
                                        longitude: locationGroups[group][0].lon
                                    });

                                    // If this marker is <120m from group root
                                    if (distance < 120) {
                                        locationGroups[group].push(marker);
                                        groupFound = true;
                                    }
                                }
                                // After looping groups, a valid match was not found
                                if (!groupFound) {
                                    let newGroup = [];
                                    newGroup.push(marker);
                                    locationGroups.push(newGroup);
                                }
                                // No groups exist yet, create one
                            } else {
                                let newGroup = [];
                                newGroup.push(marker);
                                locationGroups.push(newGroup);
                            }
                        }
                    }
                    /*
                    // Filter for invalid groups
                    locationGroups = locationGroups.filter(function(elGroup) {
                        return elGroup.length >= 1 && elGroup[0].name;
                    });
                    */

                    getHeartRateFromStore.then((hrData) => {
                            let parsedHrData = JSON.parse(JSON.stringify(hrData));

                            for (var i = locationGroups.length - 1; i >= 0; i--) {
                                let currentGroupLength = 0;
                                let currentGroupTotal = 0;
                                for (var x = locationGroups[i].length - 1; x >= 0; x--) {
                                    let visit = locationGroups[i][x];
                                    let visitStart = locationGroups[i][x].start;
                                    let visitEnd = locationGroups[i][x].end;
                                    let visitHrTotal = 0;
                                    let visitHrCount = 0;

                                    let formattedStartDate = moment(visitStart).format("YYYY-MM-DD");
                                    let formattedEndDate = moment(visitEnd).format("YYYY-MM-DD");
                                    // Loop over each day of heart rate data
                                    for (var y = 0; y < parsedHrData.length; y++) {
                                        let dayHr = parsedHrData[y];
                                        // Check if we have the correct day
                                        if (dayHr.date === formattedStartDate) {

                                            let startTime = moment(visitStart).format("HH:mm");
                                            let endTime = moment(visitEnd).format("HH:mm");


                                            // Loop over each entry of the day to find the start/end time for this visit
                                            let dataset = dayHr.data[0]["activities-heart-intraday"].dataset;
                                            // indexs
                                            let startIndex;
                                            let endIndex;
                                            for (datasetEntry in dataset) {
                                                if (dataset[datasetEntry].time.indexOf(startTime) !== -1) {
                                                    startIndex = datasetEntry;
                                                }
                                                if (dataset[datasetEntry].time.indexOf(endTime) !== -1) {
                                                    endIndex = datasetEntry;
                                                }
                                            }
                                            // Calculate HR values between our start/end index
                                            for (var z = startIndex; z < endIndex; z++) {
                                                visitHrCount++;
                                                visitHrTotal += dataset[z].value;
                                            }
                                        }
                                    }
                                    locationGroups[i][x].heartRate = Math.round(visitHrTotal / visitHrCount);
                                    if (locationGroups[i][x].heartRate !== locationGroups[i][x].heartRate) {
                                        locationGroups[i][x].heartRate = 0;
                                    } else {
                                        // We've added another HR group to this zone
                                        currentGroupTotal += locationGroups[i][x].heartRate;
                                        currentGroupLength++;
                                    }
                                }
                                locationGroups[i] = locationGroups[i].filter(element => element.heartRate > 0);
                                if (locationGroups[i].length > 0) {
                                    locationGroups[i][0].groupHeartRate = Math.round(currentGroupTotal / currentGroupLength);
                                }
                            }
                        })
                        .catch((hrError) => {
                            console.log("Error getting HR data: " + hrError);
                        });
                    // Filter out groups which do not have heart rate data
                    callback(null, locationGroups);
                })
                .catch((err) => {
                    console.log("Error reading Places...");
                    callback(err, null);
                });
        }
    }, function(err, results) {
        if (err) {
            console.log("Error (Final): " + err);
            response.status(500).end();
        } else if (JSON.stringify(results.names) === JSON.stringify(results.tags)) {
            console.log("Error (Stores returned the same content for tags and names...): ");
            response.status(500).end();
        } else {
            console.log("All ok.. returning zones");
            results.groups = results.groups.filter(element => element.length > 0);
            response.json(results);
        }
    });
});

/* Returns JSON of stored zone tags */
app.get('/ui/api/tags', function(request, response) {
    kvc.Read('healthtrackZoneTags').then((res) => {
        console.log("Read Store with datasourceId: healthtrackZoneTags - Response: " + JSON.stringify(res));
        response.json(res);
    }).catch((err) => {
        response.status(500).end();
    });
});

/* Returns JSON of stored zone names */
app.get('/ui/api/names', function(request, response) {
    kvc.Read('renamedGroups').then((res) => {
        console.log("Read Store with datasourceId: renamedGroups - Response: " + JSON.stringify(res));
        response.json(res);
    }).catch((err) => {
        response.status(500).end();
    });
});

/* Returns a JSON array of markers (start/end/lat/lon/name)*/
app.get('/ui/api/locationMarkers', function(request, response) {
    let markers = [];
    getPlacesFromStore.then((data) => {
            let jsonString = JSON.stringify(data);
            let json = JSON.parse(jsonString);
            for (day in json) {
                for (segment in json[day].segments) {
                    let marker = {};
                    // For logging
                    let placeName = json[day].segments[segment].place.name;
                    marker.start = json[day].segments[segment].startTime;
                    marker.end = json[day].segments[segment].endTime;
                    marker.lat = json[day].segments[segment].place.location.lat;
                    marker.lon = json[day].segments[segment].place.location.lon;
                    marker.name = placeName;
                    markers.push(marker);
                }
            }
            response.json(markers);
        })
        .catch((err) => {
            response.json({
                "error": err
            });
        });
});

/* Returns a JSON array of location groups, grouped by 15m distance */
app.get('/ui/api/locationGroups', function(request, response) {
    let locationGroups = [];

    getPlacesFromStore.then((data) => {
            let jsonString = JSON.stringify(data);
            let json = JSON.parse(jsonString);
            for (day in json) {
                for (segment in json[day].segments) {
                    // Create marker
                    let marker = {};
                    let placeName = json[day].segments[segment].place.name;
                    marker.start = json[day].segments[segment].startTime;
                    marker.end = json[day].segments[segment].endTime;
                    marker.lat = json[day].segments[segment].place.location.lat;
                    marker.lon = json[day].segments[segment].place.location.lon;
                    marker.name = placeName;
                    // Check if any valid groups exist
                    if (locationGroups.length > 0) {
                        let groupFound = false;
                        // Loop over each group, check if this marker belongs
                        for (group in locationGroups) {
                            let distance = geolib.getDistance({
                                latitude: marker.lat,
                                longitude: marker.lon
                            }, {
                                latitude: locationGroups[group][0].lat,
                                longitude: locationGroups[group][0].lon
                            });

                            // If this marker is <120m from group root
                            if (distance < 120) {
                                locationGroups[group].push(marker);
                                groupFound = true;
                            }
                        }
                        // After looping groups, a valid match was not found
                        if (!groupFound) {
                            let newGroup = [];
                            newGroup.push(marker);
                            locationGroups.push(newGroup);
                        }
                        // No groups exist yet, create one
                    } else {
                        let newGroup = [];
                        newGroup.push(marker);
                        locationGroups.push(newGroup);
                    }
                }
            }
            /*
            // Filter for invalid groups
            locationGroups = locationGroups.filter(function(elGroup) {
                return elGroup.length >= 1 && elGroup[0].name;
            });
            */
            // Calculate average HR per group (assign random for now)
            for (var i = 0; i < locationGroups.length; i++) {
                locationGroups[i][0].heartRate = generateRandom(67, 120);
            }

            response.json(locationGroups);
        })
        .catch((err) => {
            response.json({
                "error": err
            });
        });
});


/* Returns raw data from the moves API (sourced by driver) */
app.get('/ui/api/movesPlaces', function(request, response) {
    let DATASOURCE_DS_movesPlaces = process.env.DATASOURCE_DS_movesPlaces;
    databox.HypercatToSourceDataMetadata(DATASOURCE_DS_movesPlaces)
        .then((data) => {
            let placesOptions = {
                month: moment().format("YYYY-MM")
            }
            let dataSourceId = 'movesPlaces-' + placesOptions.month;
            let movesStream = {};
            let movesStore = null;
            databox.HypercatToSourceDataMetadata(process.env.DATASOURCE_DS_movesPlaces)
                .then((data) => {
                    movesStream = data
                    movesStore = databox.NewKeyValueClient(movesStream.DataSourceURL, false)
                    movesStore.Read('movesPlaces').then((res) => {
                        response.send(res);
                    }).catch((err) => {
                        response.json({
                            "error": err
                        });
                    });
                });
        })
        .catch((err) => {
            console.log("Error getting datasource: ", err);
        });
});


/* Frontend routes */

// Index
app.get('/ui', function(request, response) {
    response.sendfile('./public/index.html');
});



// Start Application
let httpsCredentials = databox.getHttpsCredentials();
let server = https.createServer(httpsCredentials, app);
server.listen(8080);
console.log("App listening on port 8080");