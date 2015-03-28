'use strict';

var logger = require('./logger');

process.on('uncaughtException', function(e) {
    logger.critical('main.js Global Error Caught', e);
});

function start() {

    var config = __vcConfig;

    var CHECK_DELAY = 2000;
    var UPLOAD_PATH = config['upload'];
    var PUBLIC_PATH = config['public'];
    var TEMP_PATH = config['tmp'];

    process.chdir(TEMP_PATH);

    var fs = require('fs');
    var Path = require('path');

    var FolderAnalyser = require('./folder-analyser');
    var DBVideo = require('./db-video');
    var VideoUtils = require('./ffmpeg-runner');

    var folderAnalyser = null;

    DBVideo.connect(config['db'])
        .then(function() {
            logger.v('DB Connection is OK.');

            folderAnalyser = new FolderAnalyser();

            folderAnalyser.startWatch(UPLOAD_PATH, CHECK_DELAY, onVideoUploaded);
        })
        .catch(function() {
            logger.critical('Connection with MySQL is not established.');
            process.exit(131);
        });

    function onVideoUploaded(fileName) {
        DBVideo.createNewVideo(fileName)
            .then(function(id) {
                var videoRootPath = Path.join(TEMP_PATH, id);
                var videosPath = Path.join(videoRootPath, 'videos');
                var imagesPath = Path.join(videoRootPath, 'images');

                var uploadFileName = 'upload' + Path.extname(fileName);

                fs.mkdirSync(videoRootPath);

                fs.mkdirSync(videosPath);
                fs.mkdirSync(imagesPath);

                fs.renameSync(
                    Path.join(UPLOAD_PATH, fileName),
                    Path.join(videoRootPath, uploadFileName)
                );

                try {
                    VideoUtils.processVideoFile(id, uploadFileName);
                } catch (e) {
                    logger.error('startProcess failed (' + id + ').');
                }
            }, function() {
                logger.error('DB Error (entry not created).');
            }).catch(function(e) {
                logger.error('Filesystem conflict.');
                logger.log(e);
            });
    }
}

module.exports = start;
