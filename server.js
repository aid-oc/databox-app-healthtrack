/// Dependencies
var express  = require('express');
var app      = express();                   // Create Express App
var https = require('https');
var databox = require('node-databox');
var moment = require('moment');
var morgan = require('morgan');             // Logger
var mongoose = require('mongoose');         // For MongoDB
var bodyParser = require('body-parser');    // HTML Post Parsing
var methodOverride = require('method-override'); // Simulates DELETE/PUT
var geolib = require('geolib');
var async = require('async');

// Configure Application

app.use(express.static(__dirname + '/public'));                 // Static files location
app.use('/ui/static', express.static(__dirname + '/public'));
app.use('/ui/nm', express.static(__dirname + '/node_modules'));
app.use(morgan('dev'));                                         // Logging to console
app.use(bodyParser.urlencoded({'extended':'true'}));            // Parse encoded forms
app.use(bodyParser.json());                                     // Parse JSON
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // Parse vnd.api+json as json
app.use(methodOverride());

// Set up stores
const DATABOX_ZMQ_ENDPOINT = process.env.DATABOX_ZMQ_ENDPOINT;

var kvc = databox.NewKeyValueClient(DATABOX_ZMQ_ENDPOINT, false);

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
var healthtrackZoneRenames = databox.NewDataSourceMetadata();
healthtrackZoneRenames.Description = 'HealthTrack Zone Renames';
healthtrackZoneRenames.ContentType = 'application/json';
healthtrackZoneRenames.Vendor = 'psyao1';
healthtrackZoneRenames.DataSourceType = 'healthtrackZoneRenames';
healthtrackZoneRenames.DataSourceID = 'healthtrackZoneRenames';
healthtrackZoneRenames.StoreType = 'kv';

// Register Key-Value Store
kvc.RegisterDatasource(healthtrackZoneTags)
.then(() => {
  console.log("Registered datasource: healthtrackZoneTags");
  return kvc.RegisterDatasource(healthtrackZoneRenames);
})
.then(() => {
    console.log("Registered datasource: healthtrackZoneRenames");
})
.catch((err) => {
  console.log("Error registering data source:" + err);
});

var generateRandom = function (min, max) {
    return Math.round(Math.random() * (max-min) + min);
};

var emptyObject = function (obj) {
    return !Object.keys(obj).length;
}

var getPlacesFromStore = new Promise(function(resolve, reject) {
    let DATASOURCE_DS_movesPlaces = process.env.DATASOURCE_DS_movesPlaces;
    databox.HypercatToSourceDataMetadata(DATASOURCE_DS_movesPlaces)
    .then((data)=>{
        let movesStream = {};
        let movesStore = null;
        databox.HypercatToSourceDataMetadata(process.env.DATASOURCE_DS_movesPlaces)
        .then((data)=>{
            movesStream = data
            movesStore = databox.NewKeyValueClient(movesStream.DataSourceURL, false)
            movesStore.Read('movesPlaces').then((res) => {
                resolve(res);
            }).catch((err) => {
                reject({ "error" : err });
            });
        });
    })
    .catch((err)=>{
        reject(err);
    });
});    

/* Handles saving a tag to a zone (description against a zone identified by lat/long) */
app.post('/ui/api/tagZone', function(request, response) {

    let newTag = {
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
    let datasourceId = "healthtrackZoneRenames";
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
                console.log("Read Store with datasourceId: healthtrackZoneTags - Response: " + JSON.stringify(res));
                callback(null, res);
            }).catch((err) => {
                callback(err, null);
            });
        },
        names: function(callback) {
            kvc.Read('healthtrackZoneRenames').then((res) => {
                console.log("Read Store with datasourceId: healthtrackZoneRenames - Response: " + JSON.stringify(res));
                callback(null, res);
            }).catch((err) => {
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
                                    let distance = geolib.getDistance(
                                    {latitude: marker.lat, longitude: marker.lon},
                                    {latitude: locationGroups[group][0].lat, longitude: locationGroups[group][0].lon}
                                );
                                
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

                callback(null, locationGroups);
            })
            .catch((err) => {
                callback(err, null);
            });
        }
    }, function(err, results) {
        if (err || JSON.stringify(results.names) === JSON.stringify(results.tags) ) {
            response.status(500).end();
        } else {
            response.json(results);
        }
    });
});

/* Returns JSON of stored zone tags */
app.get('/ui/api/tags', function (request, response) {
    kvc.Read('healthtrackZoneTags').then((res) => {
        console.log("Read Store with datasourceId: healthtrackZoneTags - Response: " + JSON.stringify(res));
        response.json(res);
    }).catch((err) => {
        response.status(500).end();
    });
});

/* Returns JSON of stored zone names */
app.get('/ui/api/names', function (request, response) {
    kvc.Read('healthtrackZoneRenames').then((res) => {
        console.log("Read Store with datasourceId: healthtrackZoneRenames - Response: " + JSON.stringify(res));
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
        response.json({ "error" : err });
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
                            let distance = geolib.getDistance(
                            {latitude: marker.lat, longitude: marker.lon},
                            {latitude: locationGroups[group][0].lat, longitude: locationGroups[group][0].lon}
                        );
                        
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
        response.json({ "error" : err });
    });
});


/* Returns raw data from the moves API (sourced by driver) */
app.get('/ui/api/movesPlaces', function(request, response) {
    let DATASOURCE_DS_movesPlaces = process.env.DATASOURCE_DS_movesPlaces;
    databox.HypercatToSourceDataMetadata(DATASOURCE_DS_movesPlaces)
    .then((data)=>{
        let placesOptions = {
            month: moment().format("YYYY-MM")
        }
        let dataSourceId = 'movesPlaces-'+placesOptions.month;
        let movesStream = {};
        let movesStore = null;
        databox.HypercatToSourceDataMetadata(process.env.DATASOURCE_DS_movesPlaces)
        .then((data)=>{
            movesStream = data
            movesStore = databox.NewKeyValueClient(movesStream.DataSourceURL, false)
            movesStore.Read('movesPlaces').then((res) => {
                response.send(res);
            }).catch((err) => {
                response.json({"error" : err});
            });
        });
    })
    .catch((err)=>{
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

