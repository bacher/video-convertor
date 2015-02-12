
const CHECK_DELAY = 2000;
const PATH = '/Users/Bacher/tmp/movie-upload';
const NEW_PATH = '/Users/Bacher/tmp/movie-ready';

var fs = require('fs');

var filesHash = {};

setInterval(function() {
    fs.readdirSync(PATH).filter(function(fileName) {
        //return /\.mpg$/.test(fileName);
        return true;

    }).forEach(function(fileName) {

        var filePath = PATH + '/' + fileName;

        var stats = fs.statSync(filePath);

        // Skip files lower then 1 Mb
        if (stats.size < 1000000) {
            return;
        }

        var details = filesHash[fileName];

        if (details) {
            if (details.size === stats.size) {
                fs.renameSync(filePath, NEW_PATH + fileName);

                console.log('MOVE');

                delete filesHash[fileName];
            } else {

                console.log('UPDATE SIZE');
                details.size = stats.size;
            }
        } else {

            console.log('NEW FILE');
            filesHash[fileName] = {
                size: stats.size
            };
        }

    });
}, CHECK_DELAY);

