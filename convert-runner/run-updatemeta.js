'use strict';

var fs = require('fs');
var childProcess = require('child_process');

var Promise = require('es6-promise').Promise; // jshint ignore:line
var logger = require('./logger');

var mp4boxExec = 'MP4Box';

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
                    logger.error('MP4Box ERROR:', err);
                    reject();
                });
        });
    }));
}
