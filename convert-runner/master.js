'use strict';

var fs = require('fs');
var cluster = require('cluster');

var argv = require('minimist')(process.argv.slice(2));

require('./argv-parser');
var logger = require('./logger');

if (cluster.isMaster) {
    startFork();

    cluster.on('exit', function(worker, code) {
        logger.log('Slave process died, ERRORCODE: ' + code);

        setTimeout(startFork, 1000);
    });
} else {
    require('./main')();
}

function startFork() {
    cluster.fork();

    logger.v('Slave process started.');
}
