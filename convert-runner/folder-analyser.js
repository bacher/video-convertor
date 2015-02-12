
var fs = require('fs');
var Path = require('path');

function FolderAnalyser() {

}

FolderAnalyser.prototype.startWatch = function(folderPath, timeout, callback) {
    this._filesHash = {};

    this._watchId = setInterval(this._checkFolder.bind(this, folderPath, callback), timeout);
};

FolderAnalyser.prototype.stopWatch = function() {
    this._filesHash = null;
    clearInterval(this._watchId);
};

FolderAnalyser.prototype._checkFolder = function(folderPath, callback) {
    var that = this;

    fs.readdirSync(folderPath).filter(function(fileName) {
        //return /\.mpg$/.test(fileName);
        return true;

    }).forEach(function(fileName) {

        var filePath = Path.join(folderPath, fileName);

        var stats = fs.statSync(filePath);

        // Skip files lower then 1 Mb
        if (stats.size < 1000000) {
            return;
        }

        var details = that._filesHash[fileName];

        if (details) {
            if (details.size === stats.size) {
                callback(fileName);

                delete that._filesHash[fileName];

            } else {
                details.size = stats.size;
            }

        } else {
            that._filesHash[fileName] = {
                size: stats.size
            };
        }

    });
};

module.exports = FolderAnalyser;
