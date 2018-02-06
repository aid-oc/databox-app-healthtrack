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

// Configure Application


app.use(express.static(__dirname + '/public'));                 // Static files location
app.use('/ui/static', express.static(__dirname + '/public'));
app.use(morgan('dev'));                                         // Logging to console
app.use(bodyParser.urlencoded({'extended':'true'}));            // Parse encoded forms
app.use(bodyParser.json());                                     // Parse JSON
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // Parse vnd.api+json as json
app.use(methodOverride());

// Set up stores
const DATABOX_ZMQ_ENDPOINT = process.env.DATABOX_ZMQ_ENDPOINT;

var kvc = databox.NewKeyValueClient(DATABOX_ZMQ_ENDPOINT, false);

// Set up data stores 
var movesAppSettings = databox.NewDataSourceMetadata();
movesAppSettings.Description = 'Moves app settings';
movesAppSettings.ContentType = 'application/json';
movesAppSettings.Vendor = 'psyao1';
movesAppSettings.DataSourceType = 'movesAppSettings';
movesAppSettings.DataSourceID = 'movesAppSettings';
movesAppSettings.StoreType = 'kv';

// Register Key-Value Store
kvc.RegisterDatasource(movesAppSettings)
.then(() => {
  console.log("Registered datasource: movesAppSettings");
})
.catch((err) => {
  console.log("Error registering data source:" + err);
});

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

app.get('/ui/api/locationMarkers', function(request, response) {
    getPlacesFromStore.then((data) => {
        let jsonString = JSON.stringify(data);
        console.log("Stringify: " + jsonString);
        let json = JSON.parse(jsonString);
        console.log("Object: " + json)
        for (day in json) {
            console.log("Day: " + day);
            for (segment in day.segments) {
                console.log("Segment: " + segment);
            }
        }
        response.json({"res" : "test"});
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

