'use strict';

var cluster = require('cluster');

if (cluster.isMaster) {
    startFork();

    cluster.on('exit', function(worker, code) {
        console.log('Slave process died, errorcode: ' + code);

        setTimeout(startFork, 1000);
    });
} else {
    require('./main')();
}

function startFork() {
    cluster.fork();

    console.log('Slave process started.');
}
