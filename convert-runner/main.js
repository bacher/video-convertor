'use strict';

/* globals _vc */

require('./argv-parser');

var childProcess = require('child_process');
var Path = require('path');
var logger = require('./logger');
var FolderAnalyser = require('./folder-analyser');

var CHECK_DELAY = 2000;
var UPLOAD_PATH = _vc.config['upload'];

process.on('uncaughtException', function(e) {
    logger.critical(Path.basename(__filename), 'Global Error Caught', e);
});

module.exports = function() {
    new FolderAnalyser().startWatch(UPLOAD_PATH, CHECK_DELAY, function(fileName) {

        logger.i('Starting process on file "' + fileName + '".');

        childProcess.fork('worker', [fileName]);
    });

    logger.i('Watching on directory "' + UPLOAD_PATH + '" started.');
};
