'use strict';

var Helpers = {};

Helpers.ALLOWED_QUALITIES = [
    {
        height: 240,
        bitrate: 400,
        mp4: { profile: 'high', preset: 'medium' },
        webm: { quality: 'good', cpu: 4 }
    },
    {
        height: 360,
        bitrate: 1000,
        mp4: { profile: 'high', preset: 'medium' },
        webm: { quality: 'good', cpu: 4 }
    },
    {
        height: 480,
        bitrate: 2500,
        mp4: { profile: 'high', preset: 'medium' },
        webm: { quality: 'good', cpu: 4 }
    },
    {
        height: 720,
        bitrate: 5000,
        mp4: { profile: 'high', preset: 'medium' },
        webm: { quality: 'good', cpu: 4 }
    },
    {
        height: 1080,
        bitrate: 8000,
        mp4: { profile: 'high', preset: 'medium' },
        webm: { quality: 'good', cpu: 4 }
    }
];

var FFMPEG_VIDEO_OPTIONS = [
    {
        name: 'profile'
    },
    {
        name: 'preset'
    },
    {
        name: 'quality'
    },
    {
        name: 'cpu-used'
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
        def: 'yadif'
    },
    {
        name: 'r',
        def: 24
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
        name: 'bufsize',
        suffix: 'k'
    },
    {
        name: 'movflags'
    }
];

var FFMPEG_IMAGE_OPTIONS = [
    {
        name: 'f',
        def: 'image2'
    },
    {
        name: 'ss'
    },
    {
        name: 'codec:v',
        def: 'mjpeg'
    },
    {
        name: 'vframes',
        def: 1
    },
    {
        name: 'filter:v',
        def: 'yadif'
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
        } else if (option.def) {
            paramValue = option.def;
        } else if (option.require) {
            // WHY NOT WORK?
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
