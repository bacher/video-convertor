'use strict';

var fs = require('fs');
var cluster = require('cluster');

var argv = require('minimist')(process.argv.slice(2));

var logger = require('./logger');

if (argv['outlog']) {
    logger.redirectStreamIntoFile({ out: argv['outlog'] });
}

if (argv['errlog']) {
    logger.redirectStreamIntoFile({ err: argv['errlog'] });
}

var configFile = argv['config'] || './config.json';

if (!fs.existsSync(configFile)) {
    logger.critical('Config file not exists');
    process.exit(3);
}

var config = require(configFile);

logger.setLogLevel('v');

if (cluster.isMaster) {
    startFork();

    cluster.on('exit', function(worker, code) {
        logger.log('Slave process died, ERRORCODE: ' + code);

        setTimeout(startFork, 1000);
    });
} else {
    global.__vcConfig = config;

    require('./main')();
}

function startFork() {
    cluster.fork();

    logger.v('Slave process started.');
}
