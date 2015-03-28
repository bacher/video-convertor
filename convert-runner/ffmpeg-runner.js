'use strict';

/* globals _vc */

var Path = require('path');
var fs = require('fs');
var Promise = require('es6-promise').Promise; // jshint ignore:line

var logger = require('./logger');

var getInfo = require('./run-getinfo').getInfo;
var makeParams = require('./make-params').makeParams;
var FFMpeg = require('./run-ffmpeg');


var PUBLIC_PATH = _vc.config['public'];
var TEMP_PATH = _vc.config['tmp'];

var IMAGES_DIRNAME = 'images';
var VIDEOS_DIRNAME = 'videos';


module.exports = {
    processVideoFile: function(id, uploadVideoName) {

        return new Promise(function(resolve, reject) {

            var fileName = Path.join(id, uploadVideoName);

            var details = null;

            var params = {
                db: {},
                preview: '',
                transcode: ''
            };

            var state = 'NONE';

            var videoPublicDir = Path.join(PUBLIC_PATH, id);
            var videoTempDir = Path.join(TEMP_PATH, id);

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
                        return FFMpeg.runFFMpeg(details, '-ss ' + param.time + ' -i ' + fileName + ' ' + param.configString, logFile);

                    }));
                })
                .then(function() {
                    updateState('create public video directory');

                    fs.mkdirSync(videoPublicDir);
                })
                .then(function() {
                    updateState('move images to public');

                    fs.renameSync(
                        Path.join(videoTempDir, IMAGES_DIRNAME),
                        Path.join(videoPublicDir, IMAGES_DIRNAME)
                    );
                })
                .then(function() {
                    updateState('updating db details');

                    return _vc.db.setVideoDetails(id, params.db);
                })
                .then(function() {
                    updateState('transcoding');

                    return FFMpeg.runFFMpeg(details, '-i ' + fileName + ' ' + params.transcode, 'ffmpeg-transcode.log', true);
                })
                .then(function() {
                    updateState('moving video files to public');

                    fs.renameSync(
                        Path.join(videoTempDir, VIDEOS_DIRNAME),
                        Path.join(videoPublicDir, VIDEOS_DIRNAME)
                    );
                })
                .then(function() {
                    updateState('setting 100%');

                    return _vc.db.updateVideoPercent(id, 100);
                })
                .then(function() {
                    updateState('operation completed!');

                    resolve();
                })
                .catch(function(e) {
                    if (!_vc.operationCanceled) {
                        logger.error(id, 'Something go wrong', 'STATE="' + state + '"', e);
                    }

                    reject(e);
                });

            function updateState(st) {
                state = st;

                logger.i(id, 'Status updated: "' + state + '"');
            }
        });
    }
};
