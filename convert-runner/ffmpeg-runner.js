'use strict';

var Path = require('path');
var childProcess = require('child_process');
var Promise = require('es6-promise').Promise; // jshint ignore:line

var DBVideo = require('./db-video');
var logger = require('./logger');

var getInfo = require('./run-getinfo').getInfo;
var makeParams = require('./make-params').makeParams;
var FFMpeg = require('./run-ffmpeg');


function processVideoFile(id, uploadVideoName) {

    var fileName = Path.join(id, uploadVideoName);

    var details = null;

    var params = {
        db: {},
        preview: '',
        transcode: ''
    };

    var state = 'NONE';

    updateState('getting info');

    getInfo(fileName)
        .then(function(d) {
            details = d;
            details.id = id;

            updateState('making params');

            return makeParams(details, params);
        })
        .then(function() {
            updateState('capturing preview');

            var first = true;

            return Promise.all(params.preview.map(function(param) {
                var logFile = first ? 'ffmpeg-preview.log' : null;
                first = false;
                return FFMpeg.runFFMpeg(details, '-ss '+ param.time + ' -i ' + fileName + ' ' + param.configString, logFile);

            }));
        })
        .then(function() {
            updateState('updating db details');

            return DBVideo.setVideoDetails(id, params.db);
        })
        .then(function() {
            updateState('transcoding');

            return FFMpeg.runFFMpeg(details, '-i ' + fileName + ' ' + params.transcode, 'ffmpeg-transcode.log', true);
        })
        .then(function() {
            updateState('setting 100%');

            return DBVideo.updateVideoPercent(id, 100);
        })
        .then(function() {
            updateState('operation completed!');
        })
        .catch(function(e) {
            logger.error(id, 'Something go wrong', 'STATE="' + state + '"', e);
        });

    function updateState(st) {
        state = st;

        logger.i(id, 'Status updated: "' + state + '"');
    }
}

module.exports = {
    processVideoFile: processVideoFile
};
