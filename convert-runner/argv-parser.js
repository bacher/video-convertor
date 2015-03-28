
'use strict';

var ALLOWED_PARAMS = ['outlog', 'errlog', 'config'];

var fs = require('fs');

var argv = require('minimist')(process.argv.slice(2));

ALLOWED_PARAMS.forEach(function(paramName) {
    if (paramName in argv) {
        process.env['VC' + paramName.toUpperCase()] = argv[paramName];
    }
});

var logger = require('./logger');

if (process.env['VCOUTLOG']) {
    logger.redirectStreamIntoFile({ out: process.env['VCOUTLOG'] });
}

if (process.env['VCERRLOG']) {
    logger.redirectStreamIntoFile({ err: process.env['VCERRLOG'] });
}

var configFile = process.env['VCCONFIG'] || './config.json';

if (!fs.existsSync(configFile)) {
    logger.critical('Config file not exists.');
    process.exit(3);
}

logger.setLogLevel('v');


global._vc = global._vc || {};

global._vc.config = require(configFile);
