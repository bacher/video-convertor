'use strict';

var fs = require('fs');

var MESSAGE_TYPES = {
    0: 'C',
    1: 'E',
    2: 'W',
    3: 'I',
    4: 'V'
};

var outFile = null;
var errFile = null;

var logLevel = 10;

function getTimestamp() {
    var ts = String(new Date().toJSON());
    return ts.substr(0, ts.length - 5);
}

var logger = {
    redirectStreamIntoFile: function(params) {
        if (params.out) {
            outFile = params.out;
        }

        if (params.err) {
            errFile = params.err;
        }
    },

    write: function(level) {
        if (level <= logLevel) {

            var finalMessage = '';

            for (var i = 1; i < arguments.length; ++i) {
                var message = arguments[i];

                if (typeof message !== 'string') {
                    message = JSON.stringify(message);
                }

                finalMessage += ' ';
                finalMessage += message;
            }

            var msg = '[' + MESSAGE_TYPES[level] + ']' + finalMessage + '\n';

            if (level < 2) {
                if (errFile) {
                    fs.appendFileSync(errFile, getTimestamp() + ' ' + msg);
                } else {
                    process.stderr.write(msg);
                }
            } else {
                if (outFile) {
                    fs.appendFileSync(outFile, getTimestamp() + ' ' + msg);
                } else {
                    process.stdout.write(msg);
                }
            }
        }
    },

    setLogLevel: function(level) {
        level = level.toUpperCase();

        for (var n in MESSAGE_TYPES) {
            if (level === MESSAGE_TYPES[n]) {
                logLevel = n;
            }
        }
    }
};

logger.critical = logger.write.bind(null, 0);
logger.error    = logger.write.bind(null, 1);
logger.warn     = logger.write.bind(null, 2);
logger.log      = logger.write.bind(null, 3);
logger.verbose  = logger.write.bind(null, 4);

logger.i = logger.log;
logger.v = logger.verbose;

module.exports = logger;
