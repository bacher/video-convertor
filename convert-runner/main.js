
var childProcess = require('child_process');
require('es6-promise').polyfill();

var PREVIEW_COUNT = 9;

var allowQualities = [
    {
        height: 240,
        bitrate: 500
    },
    {
        height: 360,
        bitrate: 700
    },
    {
        height: 480,
        bitrate: 1000
    },
    {
        height: 720,
        bitrate: 2000
    },
    {
        height: 1080,
        bitrate: 3000
    }
];

var execCommand = 'ffmpeg';

var VIDEO_PATTERN = '-vcodec libx264 -preset medium -s {RESOLUTION} -acodec libmp3lame -ab 128k -b:v {BITRATE}k -r 24 -filter:v yadif';
var IMAGE_PATTERN = '-f image2 -ss {TIME} -vcodec mjpeg -vframes 1 -filter:v yadif';

function processVideoFile(fileName, outputDir) {
    getInfo(fileName, outputDir)
        .then(function(details) {

            var outputFiles = [];

            var aspectRation = details.resolution.width / details.resolution.height;

            allowQualities.forEach(function(quality) {
                if (quality.height <= details.resolution.height) {
                    var configString =
                        VIDEO_PATTERN
                            .replace('{RESOLUTION}', '' + (quality.height * aspectRation) + 'x' + quality.height)
                            .replace('{BITRATE}', quality.bitrate) +
                        ',crop=' + details.crop + ' ' + outputDir + '/video_' + quality.height + '.mp4';

                    outputFiles.push(configString);
                }
            });

            var delta = details.duration / (PREVIEW_COUNT + 1);

            for (var i = 1; i <= PREVIEW_COUNT; ++i) {
                var configString =
                    IMAGE_PATTERN
                        .replace('{TIME}', Math.round(delta * i)) +
                    ',crop=' + details.crop + ' ' + outputDir + '/preview_' + i + '.jpg';

                outputFiles.push(configString);

                var configStringMini = '-s 96x54 ' +
                    IMAGE_PATTERN
                        .replace('{TIME}', Math.round(delta * i)) +
                    ',crop=' + details.crop + ' ' + outputDir + '/preview_' + i + '_m.jpg';

                outputFiles.push(configStringMini);
            }

            runFFMpeg(details, fileName, outputFiles.join(' '));
        });

}

processVideoFile('../video/news1_1m.mpg', '../video/out');

function runFFMpeg(details, fileName, optionsString) {

    // Example:
    // frame= 1443 fps= 34 q=-1.0 Lq=-1.0 size=   18925kB time=00:01:00.04 bitrate=2582.1kbits/s dup=24 drop=116
    var NOTIFY_RX = /^frame= .* time=(\d\d:\d\d:\d\d\.\d\d)/;

    var percent = 0;

    var options = '-hide_banner -y -i ' + fileName + ' ' + optionsString;

    console.warn(options);

    var ffmpeg = childProcess.spawn(execCommand, options.split(' '));

    ffmpeg.stdin.end();

    ffmpeg.stderr.on('data', function(data) {
        var notifyMatch = NOTIFY_RX.exec(data);

        if (notifyMatch) {
            var currentSecond = parseTime(notifyMatch[1]);

            percent = Math.round(100 * currentSecond / details.duration);

            console.log('PERCENT: ', percent);
        } else {
            console.warn(data.toString());
        }
    });

    ffmpeg
        .on('exit', function(data) {
            console.log('===END===', data);
        })
        .on('error', function(err) {
            console.log('ERROR:', err);
        });

}



function getInfo(fileName, outputDir) {
    return new Promise(function(resolve, reject) {
        var DURATION_RX = /^ {2}Duration: (\d\d:\d\d:\d\d\.\d\d),/;
        var RESOLUTION_RX = /^ {4}Stream.*Video:.* (\d+)x(\d+) \[/;
        //[Parsed_cropdetect_0 @ 0x7f8391d00480] x1:3 x2:719 y1:72 y2:503 w:704 h:432 x:10 y:72 pts:61200 t:0.680000 crop=704:432:10:72
        var CROP_RX = /\[Parsed_cropdetect_.* crop=(\d+:\d+:\d+:\d+)/;

        var params = '-hide_banner -y -i ' + fileName + ' ' + VIDEO_PATTERN
                .replace(' -s {RESOLUTION}', '')
                .replace('{BITRATE}', 3000) +
            ' -ss 1 -vframes 1 -vf cropdetect ' + outputDir + '/__tmp.mp4';

        console.log(params);

        var ffmpeg = childProcess.spawn(execCommand, params.split(' '));

        var isFirstData = true;

        var details = {};

        ffmpeg.stdin.end();

        ffmpeg.stderr.on('data', function(buffer) {

            buffer = buffer.toString();

            if (isFirstData) {
                isFirstData = false;

                var lines = buffer.split('\n');

                var durationMatch = DURATION_RX.exec(lines[1]);

                if (durationMatch) {
                    details.duration = parseTime(durationMatch[1]);
                }

                for (var i = 2; i < lines.length; ++i) {
                    var line = lines[i];

                    var match = RESOLUTION_RX.exec(line);

                    if (match) {
                        details.resolution = {
                            width: Number(match[1]),
                            height: Number(match[2])
                        };
                        break;
                    }
                }

            } else {
                var cropMatch = CROP_RX.exec(buffer);

                if (cropMatch) {
                    details.crop = cropMatch[1];
                }
            }

        });

        ffmpeg.on('exit', function(errorCode) {
            if (errorCode === 0 && details.duration && details.resolution && details.crop) {
                resolve(details);
            } else {
                reject();
            }
        })

    });
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
