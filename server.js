/// Dependencies
var express  = require('express');
var app      = express();                   // Create Express App
var mongoose = require('mongoose');         // Mongo Library
var morgan = require('morgan');             // Logger
var bodyParser = require('body-parser');    // HTML Post Parsing
var methodOverride = require('method-override'); // Simulates DELETE/PUT

// Configure Application

mongoose.connect('mongodb://localhost:27017/healthtrack');     // Connect to local mongo DB

app.use(express.static(__dirname + '/public'));                 // Static files location
app.use(morgan('dev'));                                         // Logging to console
app.use(bodyParser.urlencoded({'extended':'true'}));            // Parse encoded forms
app.use(bodyParser.json());                                     // Parse JSON
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // Parse vnd.api+json as json
app.use(methodOverride());

// Start Application
app.listen(8080);
console.log("App listening on port 8080");

