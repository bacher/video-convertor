'use strict';

var logger = require('./logger');
var ffmpegHelper = require('./ffmpeg-helper');

var PREVIEW_COUNT = 9;

function makeParams(details, params) {
    var dbFormats = [];

    var filters = 'crop=' + details.crop + ',yadif';

    params.transcode = makeTranscodeParams(details, filters, dbFormats);

    params.preview = makePreviewParams(details, filters);

    params.db = makeDbDetails(details, dbFormats);
}

function makeTranscodeParams(details, filters, dbFormats) {
    var transcodeParams = [];

    ffmpegHelper.ALLOWED_QUALITIES.forEach(function(quality) {
        if (quality.height <= details.resolution.height) {

            var newFileName = 'video_' + quality.height;

            var size = (quality.height * 2) + ':' + quality.height;

            transcodeParams.push(ffmpegHelper.makeParams({
                'profile': quality.mp4.profile,
                'preset': quality.mp4.preset,
                'codec:v': 'libx264',
                'b:v': quality.bitrate,
                'filter:v': filters + ',scale=' + size,
                'codec:a': 'libmp3lame',
                'b:a': 120,
                'bufsize': quality.bitrate * 2,
                'movflags': 'faststart',
                'file': details.id + '/videos/' + newFileName + '.mp4'
            }));

            transcodeParams.push(ffmpegHelper.makeParams({
                'quality': quality.webm.quality,
                'cpu-used': quality.webm.cpu,
                'codec:v': 'libvpx',
                'b:v': quality.bitrate,
                'filter:v': filters + ',scale=' + size,
                'codec:a': 'libvorbis',
                'b:a': 120,
                'bufsize': quality.bitrate * 2,
                'file': details.id + '/videos/' + newFileName + '.webm'
            }));

            dbFormats.push(quality.height);
        }
    });

    return transcodeParams.join(' ');
}

function makePreviewParams(details, filters) {
    var previewParams = [];

    var delta = details.duration / (PREVIEW_COUNT + 1);

    for (var i = 0; i < PREVIEW_COUNT; ++i) {
        previewParams.push({
            configString: ffmpegHelper.makeParams({
                'type': 'image',
                'filter:v': filters,
                'file': details.id + '/images/preview_' + (i + 1) + '.jpg'
            }),
            time: 5 + Math.round(delta * i)
        });
    }

    return previewParams;
}

function makeDbDetails(details, dbFormats) {
    var maxHeight = dbFormats[dbFormats.length - 1];
    var maxWidth = details.resolution.width * (maxHeight / details.resolution.height);

    return {
        formats: {
            'mp4': dbFormats,
            'webm': dbFormats
        },
        duration: details.duration,
        width: maxWidth,
        height: maxHeight
    };
}

module.exports = {
    makeParams: makeParams
};
