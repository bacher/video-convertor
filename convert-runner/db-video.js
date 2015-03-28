'use strict';

/* globals _vc */

var mysql = require('mysql');
var Promise = require('es6-promise').Promise; // jshint ignore:line

var logger = require('./logger');

var SYMBOLS_BASE = 'abcdefghijklmnopqrstuvwxyz';
SYMBOLS_BASE += SYMBOLS_BASE.toUpperCase();
SYMBOLS_BASE += '0123456789';

var RECONNECT_TIMEOUT = 500;

function DBVideo() {
    this._connected = false;
}

DBVideo.prototype.connect = function(options) {
    var that = this;

    return new Promise(function(resolve, reject) {
        that._table = options.table;

        that._connection = mysql.createConnection({
            host: options.host,
            user: options.user || 'mysql',
            password: options.password || '',
            database: options.database
        });

        that._connection.connect(function(err) {
            if (err) {
                reject(err);
            } else {
                that._connected = true;

                that._connection.on('error', function(err) {

                    logger.error('Connection error', err);

                    setTimeout(function() {

                        logger.i('Try reconnect.');

                        that._connection.connect();

                    }, RECONNECT_TIMEOUT);
                });

                resolve();
            }
        });

    });

};

    DBVideo.prototype.createNewVideo = function(title) {
    var that = this;

    return new Promise(function(resolve, reject) {
        var hash = createHash(20);

        var nowSeconds = Math.floor(Number(new Date()) / 1000);

        that._connection.query(
            'INSERT INTO ?? (video_percent,hash,created,date,title,title2,video_image) VALUES (0,?,?,?,?,?,1)',
            [that._table, hash, nowSeconds, nowSeconds, title, title],
            function(err, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve(String(data.insertId));
                }
            }
        );
    });
};

DBVideo.prototype.setVideoDetails = function(id, options) {
    var that = this;

    return new Promise(function(resolve, reject) {
        that._connection.query(
            'UPDATE ?? SET `video_formats` = ?, video_duration = ?, video_width = ?, video_height = ? WHERE `id` = ?',
            [that._table, JSON.stringify(options.formats), options.duration, options.width, options.height, id],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });
};

DBVideo.prototype.updateVideoPercent = function(id, percent) {
    var that = this;

    return new Promise(function(resolve, reject) {
        that._connection.query(
            'UPDATE ?? SET `video_percent` = ? WHERE `id` = ?', [that._table, percent, id],
            function(err, response) {
                if (err) {
                    reject({ mysqlError: err });
                } else if (response.affectedRows === 0) {
                    _vc.operationCanceled = true;

                    reject({ idNotFound: true });
                } else {
                    resolve();
                }
            }
        );
    });
};

DBVideo.prototype.close = function() {
    if (this._connected) {
        this._connection.end();
        this._connected = false;
    }
};

function createHash(length) {
    var hash = '';

    for (var i = 0; i < length; ++i) {
        hash += SYMBOLS_BASE[Math.floor(Math.random() * SYMBOLS_BASE.length)];
    }

    return hash;
}

module.exports = DBVideo;
