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
            movesStore.Read(dataSourceId).then((res) => {
                console.log("Attempting read on movesStore...");
                console.log(JSON.stringify(res));
                response.send('Found places');
            }).catch((err) => {
                response.send('error finding places: ' + err);
            });
        });
    })
    .catch((err)=>{
        console.log("Error getting datasource: ", err);
    });
});


/*
// Get all health points
app.get('/api/healthpoint', function(request, response) {
    HealthPoint.find(function(error, healthpoints) {
        // Failed to retrieve HealthPoints, return error
        if (error) {
            response.send(error);
        }
        // Return all HealthPoints as JSON
        response.json(healthpoints);
    });
});

// Create new health point and return the set
app.post('/api/healthpoint', function(request, response) {
    HealthPoint.create({
        lat : request.body.lat,
        long : request.body.long,
        description: request.body.description,
        time : request.body.time
    }, function(error, todo) {
        if (error) {
            response.send(error);
        }
        // Return new set
        HealthPoint.find(function(err, healthpoints) {
            if (err)
                response.send(err)
            response.json(healthpoints);
        });
    });
});

// Delete a health point
app.delete('/api/healthpoint/:id', function (request, response) {
    HealthPoint.remove({
        _id : request.params.id
    }, function(error, healthpoint) {
        // Delete failed, return error
        if (error) {
            response.send(error);
        }
        // Otherwise return the new set of healthpoints
        HealthPoint.find(function(error, healthpoints) {
            // Failed to retrieve HealthPoints, return error
            if (error) {
                response.send(error);
            }
            // Return all HealthPoints as JSON
            response.json(healthpoints);
        });
    });
});
*/


/* Frontend routes */

// Feedback
app.get('/feedback', function(request, response) {
    response.sendfile('./public/feedback.html');
});

// Index
app.get('/ui', function(request, response) {
    response.sendfile('./public/index.html');
});



// Start Application
let httpsCredentials = databox.getHttpsCredentials();
let server = https.createServer(httpsCredentials, app);
server.listen(8080); 
console.log("App listening on port 8080");

