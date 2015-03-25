'use strict';

var fs = require('fs');
var childProcess = require('child_process');
var Path = require('path');
var Promise = require('es6-promise').Promise; // jshint ignore:line

var DBVideo = require('./db-video');
var ffmpegHelper = require('./ffmpeg-helper');
var parseTime = require('./parse-time').parseTime;
var logger = require('./logger');

var ffmpegExec = 'ffmpeg';

function runFFMpeg(details, optionsString, saveParamsFileName, analizeProcess) {
    return new Promise(function(resolve, reject) {

        // Example:
        // frame= 1443 fps= 34 q=-1.0 Lq=-1.0 size=   18925kB time=00:01:00.04 bitrate=2582.1kbits/s dup=24 drop=116
        var NOTIFY_RX = /^frame= .* time=(\d\d:\d\d:\d\d\.\d\d)/;

        var percent = 0;

        var options = ffmpegHelper.makeHeadParams() + ' ' + optionsString;

        if (saveParamsFileName) {
            fs.writeFileSync(Path.join(details.id, saveParamsFileName), 'ffmpeg ' + options);
        }

        var ffmpeg = childProcess.spawn(ffmpegExec, options.split(' '), {
            stdio: [
                'ignore',
                'ignore',
                'pipe'
            ]
        });

        var outputBuffer = [];

        ffmpeg.stderr.on('data', function(data) {
            outputBuffer.push(data);

            if (analizeProcess) {

                var notifyMatch = NOTIFY_RX.exec(data);

                if (notifyMatch) {
                    var currentSecond = parseTime(notifyMatch[1]);

                    var newPercent = Math.round(100 * currentSecond / details.duration);

                    if (percent !== newPercent) {
                        percent = newPercent;

                        DBVideo.updateVideoPercent(details.id, percent);
                    }
                }
            }
        });

        ffmpeg
            .on('exit', function(errorCode) {
                if (errorCode === 0) {
                    // TODO: Не забыть заменить на рабочий код.
                    //runMP4Box(details.id + '/videos', outputFileNames)
                    //    .then(function() {
                    //        resolve();
                    //    })
                    //    .catch(function(err) {
                    //        reject(err);
                    //    });
                    resolve();
                } else {
                    reject({
                        app: 'ffmpeg',
                        errorCode: errorCode,
                        output: outputBuffer.join('')
                    });
                }
            })
            .on('error', function(err) {
                logger.error('FFMPEG ERROR:', err);
            });

    });
}

module.exports = {
    runFFMpeg: runFFMpeg
};
