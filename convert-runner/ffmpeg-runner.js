
var childProcess = require('child_process');
var Promise = require('es6-promise').Promise;
var fs = require('fs');
var Path = require('path');
var DBVideo = require('./db-video');

var PREVIEW_COUNT = 9;

var start = Number(new Date());

var allowQualities = [
    {
        height: 240,
        bitrate: 200
    },
    {
        height: 360,
        bitrate: 300
    },
    {
        height: 480,
        bitrate: 500
    },
    {
        height: 720,
        bitrate: 1000
    },
    {
        height: 1080,
        bitrate: 2000
    }
];

var ffmpegExec = 'ffmpeg';
var mp4boxExec = 'MP4Box';

var VIDEO_PATTERN = '-vcodec {VIDEO_CODEC} -preset medium -s {RESOLUTION} -acodec {AUDIO_CODEC} -ab 128k -b:v {BITRATE}k -r 24 -filter:v yadif';
var IMAGE_PATTERN = '-f image2 -ss {TIME} -vcodec mjpeg -vframes 1 -filter:v yadif';

function processVideoFile(path, uploadVideoName) {

    var fileName = Path.join(path, uploadVideoName);

    getInfo(fileName).then(
        function(details) {
            var outputFiles = [];
            var outputFileNames = [];

            var aspectRation = details.resolution.width / details.resolution.height;

            allowQualities.forEach(function(quality) {
                if (quality.height <= details.resolution.height) {
                    var newFileName = 'video_' + quality.height;

                    var configString =
                        VIDEO_PATTERN
                            .replace('{VIDEO_CODEC}', 'libx264')
                            .replace('{AUDIO_CODEC}', 'libmp3lame')
                            .replace('{RESOLUTION}', '' + (quality.height * aspectRation) + 'x' + quality.height)
                            .replace('{BITRATE}', quality.bitrate) +
                        ',crop=' + details.crop + ' ' + path + '/videos/' + newFileName + '.mp4' +
                        ' ' +
                        VIDEO_PATTERN
                            .replace('{VIDEO_CODEC}', 'libvpx')
                            .replace('{AUDIO_CODEC}', 'libvorbis')
                            .replace('{RESOLUTION}', '' + (quality.height * aspectRation) + 'x' + quality.height)
                            .replace('{BITRATE}', quality.bitrate) +
                        ',crop=' + details.crop + ' ' + path + '/videos/' + newFileName + '.webm';

                    outputFiles.push(configString);

                    outputFileNames.push(newFileName + '.mp4');
                }
            });

            var delta = details.duration / (PREVIEW_COUNT + 1);

            for (var i = 1; i <= PREVIEW_COUNT; ++i) {
                var configString =
                    IMAGE_PATTERN
                        .replace('{TIME}', Math.round(delta * i)) +
                    ',crop=' + details.crop + ' ' + path + '/images/preview_' + i + '.jpg';

                outputFiles.push(configString);

                var configStringMini = '-s 96x54 ' +
                    IMAGE_PATTERN
                        .replace('{TIME}', Math.round(delta * i)) +
                    ',crop=' + details.crop + ' ' + path + '/images/preview_' + i + '_m.jpg';

                outputFiles.push(configStringMini);
            }

            runFFMpeg(details, fileName, outputFiles.join(' '), path, outputFileNames);
        },
        function(err) {
            console.log('Err', err);
        }
    );

}

function runFFMpeg(details, fileName, optionsString, path, outputFileNames) {

    // Example:
    // frame= 1443 fps= 34 q=-1.0 Lq=-1.0 size=   18925kB time=00:01:00.04 bitrate=2582.1kbits/s dup=24 drop=116
    var NOTIFY_RX = /^frame= .* time=(\d\d:\d\d:\d\d\.\d\d)/;

    var percent = 0;

    var options = '-hide_banner -y -i ' + fileName + ' ' + optionsString;

    fs.writeFileSync(path + '/ffmpeg-run.txt', 'ffmpeg ' + options);

    var ffmpeg = childProcess.spawn(ffmpegExec, options.split(' '));

    ffmpeg.stdin.end();

    ffmpeg.stderr.on('data', function(data) {
        var notifyMatch = NOTIFY_RX.exec(data);

        if (notifyMatch) {
            var currentSecond = parseTime(notifyMatch[1]);

            var newPercent = Math.round(100 * currentSecond / details.duration);

            if (percent !== newPercent) {
                percent = newPercent;

                console.log('PERCENT: ', percent);

                DBVideo.updateVideoState(path, percent);
            }

        } else {
            console.warn(data.toString());
        }
    });

    ffmpeg
        .on('exit', function(errorCode) {
            if (errorCode === 0) {

                runMP4Box(path + '/videos', outputFileNames);

            }
        })
        .on('error', function(err) {
            console.warn('FFMPEG ERROR:', err);
        });

}

function runMP4Box(outputDir, mp4Files) {

    Promise.all(mp4Files.map(function(mp4File) {

        return new Promise(function(resolve, reject) {
            var options = '-add ' + outputDir + '/' + mp4File + ' ' + outputDir + '/' + mp4File.replace('.mp4', '_w.mp4');
            var mp4box = childProcess.spawn(mp4boxExec, options.split(' '));

            mp4box.stdin.end();

            mp4box
                .on('exit', function(errorCode) {
                    if (errorCode === 0) {
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
    })).then(function() {
        console.log('===END===', new Date() - start);

    }, function() {
        console.warn('===ERROR===');
    });
}

function getInfo(fileName) {
    return new Promise(function(resolve, reject) {

        var params = '-hide_banner -y -i ' + fileName + ' ' + VIDEO_PATTERN
                .replace('{VIDEO_CODEC}', 'libx264')
                .replace('{AUDIO_CODEC}', 'libmp3lame')
                .replace(' -s {RESOLUTION}', '')
                .replace('{BITRATE}', 3000) +
            ' -ss 00.50 -vframes 1 -vf cropdetect ' + Path.resolve(fileName, '../__tmp.mp4');

        var ffmpeg = childProcess.spawn(ffmpegExec, params.split(' '));

        ffmpeg.stdin.end();

        var outBuffers = [];

        ffmpeg.stderr.on('data', function(buffer) {
            outBuffers.push(buffer);
        });

        ffmpeg.on('exit', function(errorCode) {
            if (errorCode === 0) {
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
        })

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
