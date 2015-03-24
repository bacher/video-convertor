'use strict';

var mysql = require('mysql');
var Promise = require('es6-promise').Promise; // jshint ignore:line

var SYMBOLS_BASE = 'abcdefghijklmnopqrstuvwxyz';
SYMBOLS_BASE += SYMBOLS_BASE.toUpperCase();
SYMBOLS_BASE += '0123456789';

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
    createNewVideo: function(title) {
        return new Promise(function(resolve, reject) {
            var hash = createHash(20);

            var nowSeconds = Math.floor(Number(new Date()) / 1000);

            DBVideo._connection.query(
                'INSERT INTO ?? (video_percent,hash,created,date,title,video_image) VALUES (0,?,?,?,?,1)',
                [DBVideo._table, hash, nowSeconds, nowSeconds, title],
                function(err, data) {
                    if (err) {
                        reject();
                    } else {
                        resolve(String(data.insertId));
                    }
                }
            );
        });
    },
    setVideoDetails: function(id, options) {
        return new Promise(function(resolve, reject) {
            DBVideo._connection.query(
                'UPDATE ?? SET `video_formats` = ?, video_duration = ?, video_width = ?, video_height = ? WHERE `id` = ?',
                [DBVideo._table, JSON.stringify(options.formats), options.duration, options.width, options.height, id],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                }
            );
        });
    },
    updateVideoPercent: function(id, percent) {
        return new Promise(function(resolve, reject) {
            DBVideo._connection.query(
                'UPDATE ?? SET `video_percent` = ? WHERE `id` = ?', [DBVideo._table, percent, id],
                resolveHelper(resolve, reject)
            );
        });
    }
};

function createHash(length) {
    var hash = '';

    for (var i = 0; i < length; ++i) {
        hash += SYMBOLS_BASE[Math.floor(Math.random() * SYMBOLS_BASE.length)];
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
