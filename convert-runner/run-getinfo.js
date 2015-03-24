'use strict';

var fs = require('fs');
var Path = require('path');
var childProcess = require('child_process');
var Promise = require('es6-promise').Promise; // jshint ignore:line

var ffmpegHelper = require('./ffmpeg-helper');
var parseTime = require('./parse-time').parseTime;
var logger = require('./logger');

var ffmpegExec = 'ffmpeg';

function getInfo(fileName) {
    return new Promise(function(resolve, reject) {

        var outputFile = Path.resolve(fileName, '../__tmp.mp4');

        var params =
            ffmpegHelper.makeHeadParams() +
            ' -i ' + fileName + ' ' +
            ffmpegHelper.makeParams({
                'profile': 'high',
                'preset': 'veryfast',
                'codec:v': 'libx264',
                'codec:a': 'libvo_aacenc',
                'ss': '00.50',
                'vframes': 1,
                'filter:v': 'cropdetect',
                'file': outputFile
            });

        var ffmpeg = childProcess.spawn(ffmpegExec, params.split(' '), {
            stdio: [
                'ignore',
                'ignore',
                'pipe'
            ]
        });

        var outBuffers = [];

        ffmpeg.stderr.on('data', function(buffer) {
            outBuffers.push(buffer);
        });

        ffmpeg.on('exit', function(errorCode) {
            if (errorCode === 0) {

                fs.unlinkSync(outputFile);

                var output = outBuffers.join('');

                var details = extractDetails(output);

                if (details && details.resolution && details.crop && details.duration) {
                    resolve(details);
                } else {
                    reject(details);
                }
            } else {
                reject({
                    errorCode: errorCode
                });
            }
        });

    });
}

function extractDetails(output) {
    var DURATION_RX = /^ {2}Duration: (\d\d:\d\d:\d\d\.\d\d),/;
    var RESOLUTION_RX = /^ {4}Stream.*Video:.* (\d+)x(\d+) \[/;
    //[Parsed_cropdetect_0 @ 0x7f8391d00480] x1:3 x2:719 y1:72 y2:503 w:704 h:432 x:10 y:72 pts:61200 t:0.680000 crop=704:432:10:72
    var CROP_RX = /\[Parsed_cropdetect_.* crop=(\d+:\d+:\d+:\d+)/;

    var lines = output.split('\n');

    var details = {};

    for (var i = 0; i < lines.length; ++i) {
        var text = lines[i];

        if (!details.duration) {
            var durationMatch = DURATION_RX.exec(text);

            if (durationMatch) {
                details.duration = parseTime(durationMatch[1]);
            }
        }

        if (!details.resolution) {
            var resolutionMatch = RESOLUTION_RX.exec(text);

            if (resolutionMatch) {
                details.resolution = {
                    width: Number(resolutionMatch[1]),
                    height: Number(resolutionMatch[2])
                };
            }
        }

        var cropMatch = CROP_RX.exec(text);

        if (cropMatch) {
            details.crop = cropMatch[1];
        }
    }

    return details;
}


module.exports = {
    getInfo: getInfo
};
