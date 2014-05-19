"use strict";

var express = require('express');
var app = express();
var routers = {};
var NoteRouter = express.Router();
routers.NoteRouter = NoteRouter;

var handler = require('./request-handler');

require('./config.js')(app, express, routers);
require('../note/note_routes.js')(NoteRouter);

app.get('/', handler.renderIndex);
app.get('/*', handler.fetchSuggestions);

module.exports = exports = app;