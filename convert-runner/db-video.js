'use strict';

var mysql = require('mysql');
var Promise = require('es6-promise').Promise; // jshint ignore:line

var DBVideo = {
    connect: function(options) {
        return new Promise(function(resolve, reject) {
            DBVideo._table = options.table;

            DBVideo._connection = mysql.createConnection({
                host: options.host,
                user: options.user || 'mysql',
                password: options.password || '',
                database: options.database
            });

            DBVideo._connection.connect(function(err) {
                if (err) {
                    reject(err);
                } else {
                    DBVideo._connected = true;

                    resolve();
                }
            });
        });

    },
    createNewVideo: function() {
        return new Promise(function(resolve, reject) {
            var hash = createHash(6);

            DBVideo._connection.query(
                'INSERT INTO ?? VALUES(?, 0)', [DBVideo._table, hash],
                function(err) {
                    if (err) {
                        reject();
                    } else {
                        resolve(hash);
                    }
                }
            );
        });
    },
    updateVideoState: function(hash, state) {
        return new Promise(function(resolve, reject) {
            DBVideo._connection.query(
                'UPDATE ?? SET `state` = ? WHERE `id` = ?', [DBVideo._table, state, hash],
                resolveHelper(resolve, reject)
            );
        });
    }
};

function createHash(length) {
    var hash = '';

    for (var i = 0; i < length; ++i) {
        hash += Math.floor(Math.random() * 10);
    }

    return hash;
}

function resolveHelper(resolve, reject) {
    return function(err) {
        if (err) {
            reject(err);
        } else {
            resolve();
        }
    };
}

module.exports = DBVideo;
