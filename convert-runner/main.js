
const CHECK_DELAY = 2000;
const UPLOAD_PATH = '/Users/Bacher/tmp/movie-upload';
const NEW_PATH = '/Users/Bacher/tmp/movie-ready';

var Path = require('path');
var FolderAnalyser = require('./folder-analyser');

var analyser = new FolderAnalyser();

analyser.startWatch(UPLOAD_PATH, CHECK_DELAY, function(fileName) {
    fs.renameSync(Path.join(UPLOAD_PATH, fileName), Path.join(NEW_PATH, fileName));
});
