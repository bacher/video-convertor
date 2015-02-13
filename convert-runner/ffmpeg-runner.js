'use strict';

var childProcess = require('child_process');
var Promise = require('es6-promise').Promise; // jshint ignore:line
var fs = require('fs');
var Path = require('path');
var DBVideo = require('./db-video');
var ffmpegHelper = require('./ffmpeg-helper');

var PREVIEW_COUNT = 9;

var start = Number(new Date());

var ffmpegExec = 'ffmpeg';
var mp4boxExec = 'MP4Box';

function processVideoFile(path, uploadVideoName) {

    var fileName = Path.join(path, uploadVideoName);

    getInfo(fileName).then(function(details) {
        var outputParams = [];
        var outputMp4Names = [];

        var aspectRation = details.resolution.width / details.resolution.height;
        var filters = 'yadif,crop=' + details.crop;

        ffmpegHelper.ALLOWED_QUALITIES.forEach(function(quality) {
            if (quality.height <= details.resolution.height) {

                var newFileName = 'video_' + quality.height;

                var size = '' + (quality.height * aspectRation) + 'x' + quality.height;

                outputParams.push(ffmpegHelper.makeParams({
                    's': size,
                    'codec:v': 'libx264',
                    'b:v': quality.bitrate,
                    'filter:v': filters,
                    'codec:a': 'libmp3lame',
                    'b:a': 120,
                    'file': path + '/videos/' + newFileName + '_.mp4'
                }));

                outputParams.push(ffmpegHelper.makeParams({
                    's': size,
                    'codec:v': 'libvpx',
                    'b:v': quality.bitrate,
                    'filter:v': filters,
                    'codec:a': 'libvorbis',
                    'b:a': 120,
                    'file': path + '/videos/' + newFileName + '.webm'
                }));

                outputMp4Names.push(newFileName);
            }
        });

        var delta = details.duration / (PREVIEW_COUNT + 1);

        for (var i = 1; i <= PREVIEW_COUNT; ++i) {

            var time = Math.round(delta * i);

            outputParams.push(ffmpegHelper.makeParams({
                'type': 'image',
                'ss': time,
                'filter:v': filters,
                'file': path + '/images/preview_' + i + '.jpg'
            }));

            outputParams.push(ffmpegHelper.makeParams({
                'type': 'image',
                'ss': time,
                'filter:v': filters,
                'file': path + '/images/preview_' + i + '_m.jpg',
                's': '96x54'
            }));
        }

        runFFMpeg(details, fileName, outputParams.join(' '), path, outputMp4Names);

    }).catch(function(err) {
        console.log('Err', err);
    });

}

function runFFMpeg(details, fileName, optionsString, path, outputFileNames) {
    return new Promise(function(resolve, reject) {

        // Example:
        // frame= 1443 fps= 34 q=-1.0 Lq=-1.0 size=   18925kB time=00:01:00.04 bitrate=2582.1kbits/s dup=24 drop=116
        var NOTIFY_RX = /^frame= .* time=(\d\d:\d\d:\d\d\.\d\d)/;

        var percent = 0;

        var options = ffmpegHelper.makeHeadParams() + ' -i ' + fileName + ' ' + optionsString;

        fs.writeFileSync(path + '/ffmpeg-run.txt', 'ffmpeg ' + options);

        var ffmpeg = childProcess.spawn(ffmpegExec, options.split(' '), {
            stdio: [
                'ignore',
                'ignore',
                'pipe'
            ]
        });

        ffmpeg.stderr.on('data', function(data) {
            var notifyMatch = NOTIFY_RX.exec(data);

            if (notifyMatch) {
                var currentSecond = parseTime(notifyMatch[1]);

                var newPercent = Math.round(100 * currentSecond / details.duration);

                if (percent !== newPercent) {
                    percent = newPercent;

                    DBVideo.updateVideoState(path, percent);
                }

            }
        });

        ffmpeg
            .on('exit', function(errorCode) {
                if (errorCode === 0) {

                    runMP4Box(path + '/videos', outputFileNames)
                        .then(function() {
                            resolve();
                        })
                        .catch(function(err) {
                            reject(err);
                        });
                }
            })
            .on('error', function(err) {
                console.warn('FFMPEG ERROR:', err);
            });

    });
}

function runMP4Box(outputDir, mp4Files) {
    return Promise.all(mp4Files.map(function(mp4File) {
        return new Promise(function(resolve, reject) {

            var inputFile = outputDir + '/' + mp4File + '_.mp4';
            var outputFile = outputDir + '/' + mp4File + '.mp4';

            var options = '-add ' + inputFile + ' ' + outputFile;
            var mp4box = childProcess.spawn(mp4boxExec, options.split(' '));

            mp4box.stdin.end();

            mp4box
                .on('exit', function(errorCode) {
                    if (errorCode === 0) {

                        fs.unlinkSync(inputFile);

                        resolve();
                    } else {
                        reject();
                    }
                })
                .on('error', function(err) {
                    console.warn('MP4Box ERROR:', err);
                    reject();
                });
        });
    }));
}

function getInfo(fileName) {
    return new Promise(function(resolve, reject) {

        var outputFile = Path.resolve(fileName, '../__tmp.mp4');

        var params =
            ffmpegHelper.makeHeadParams() +
            ' -i ' + fileName + ' ' +
            ffmpegHelper.makeParams({
                'codec:v': 'libx264',
                'codec:a': 'libmp3lame',
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

function parseTime(timeString) {

    var durationChunks = timeString.split(/[\.:]/).map(Number);

    return (
    durationChunks[0] * 60 * 60 +
    durationChunks[1] * 60 +
    durationChunks[2] +
    (durationChunks[3] > 50 ? 1 : 0)
    );
}

var VideoUtils = {
    startProcess: processVideoFile
};

module.exports = VideoUtils;
