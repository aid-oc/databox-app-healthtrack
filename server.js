/// Dependencies
require('dotenv').config();
var express  = require('express');
var app      = express();                   // Create Express App
var mongoose = require('mongoose');         // Mongo Library
var morgan = require('morgan');             // Logger
var mongoose = require('mongoose');         // For MongoDB
var bodyParser = require('body-parser');    // HTML Post Parsing
var methodOverride = require('method-override'); // Simulates DELETE/PUT

// Configure Application

mongoose.connect('mongodb://localhost/healthtrack');

// test45672sjsuser
app.use(express.static(__dirname + '/public'));                 // Static files location
app.use(morgan('dev'));                                         // Logging to console
app.use(bodyParser.urlencoded({'extended':'true'}));            // Parse encoded forms
app.use(bodyParser.json());                                     // Parse JSON
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // Parse vnd.api+json as json
app.use(methodOverride());

/* Will be translated to databox equivalent calls when possible */
// Define Database Model
var HealthPoint = mongoose.model('HealthPoint', {
    lat : Number,
    long : Number,
    description : String,
    time : Date
});

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


/* Frontend routes */

// SPA
app.get('*', function(request, response) {
    response.sendfile('./public/index.html');
});



// Start Application
app.listen(8080);
console.log("App listening on port 8080");

