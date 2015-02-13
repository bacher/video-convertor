'use strict';

var Helpers = {};

Helpers.ALLOWED_QUALITIES = [
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

var FFMPEG_VIDEO_OPTIONS = [
    {
        name: 'profile'
    },
    {
        name: 'preset',
        default: 'medium'
    },
    {
        name: 's'
    },
    {
        name: 'ss'
    },
    {
        name: 'vframes'
    },
    {
        name: 'codec:v',
        require: true
    },
    {
        name: 'b:v',
        suffix: 'k'
    },
    {
        name: 'filter:v',
        default: 'yadif'
    },
    {
        name: 'r',
        default: 24
    },
    {
        name: 'codec:a',
        require: true
    },
    {
        name: 'b:a',
        suffix: 'k'
    },
    {
        name: 'maxrate'
    },
    {
        name: 'bufsize'
    }
];

var FFMPEG_IMAGE_OPTIONS = [
    {
        name: 'f',
        default: 'image2'
    },
    {
        name: 'ss',
        require: true
    },
    {
        name: 'codec:v',
        default: 'mjpeg'
    },
    {
        name: 'vframes',
        default: 1
    },
    {
        name: 'filter:v',
        default: 'yadif'
    }
];

Helpers.makeHeadParams = function() {
    return '-hide_banner -threads 0 -y';
};

Helpers.makeParams = function(options) {

    var allOptions = FFMPEG_VIDEO_OPTIONS;

    if (options.type === 'image') {
        allOptions = FFMPEG_IMAGE_OPTIONS;
    }

    var params = '';

    allOptions.forEach(function(option) {
        var paramValue = null;

        if (option.name in options) {
            paramValue = options[option.name];
        } else if (option.default) {
            paramValue = option.default;
        } else if (option.require) {
            throw new Error('Miss required parameter.');
        }

        if (paramValue !== null) {
            params += '-' + option.name + ' ' + paramValue + (option.suffix || '') + ' ';
        }
    });

    if ('file' in options) {
        params += options.file;
    } else {
        throw new Error('Miss filename.');
    }

    return params;
};

module.exports = Helpers;
