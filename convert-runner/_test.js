'use strict';

var Promise = require('es6-promise').Promise; // jshint ignore:line

var helper = require('./ffmpeg-helper');

var prom = new Promise(function(resolve, reject) {
    setTimeout(function() {
        resolve();
    });
});

prom
    .then(function() {
        return new Promise(function(resolve, reject) {
            return helper.makeParams({});
        });
    })
    .then(function() {
        console.log('OK');
    })
    .catch(function(e) {
        console.log('ERROR', e);
    });

