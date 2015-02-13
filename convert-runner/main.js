
function start() {

    const CHECK_DELAY = 2000;
    const UPLOAD_PATH = '/Users/Bacher/tmp/movie-upload';
    const PUBLIC_PATH = '/Users/Bacher/tmp/movie-www';

    process.chdir(PUBLIC_PATH);

    var fs = require('fs');
    var Path = require('path');

    var FolderAnalyser = require('./folder-analyser');
    var DBVideo = require('./db-video');
    var VideoUtils = require('./ffmpeg-runner');

    var folderAnalyser = null;

    DBVideo.connect({
        host: 'localhost',
        database: 'test',
        table: 'videos'
    }).then(
        function() {
            folderAnalyser = new FolderAnalyser();

            folderAnalyser.startWatch(UPLOAD_PATH, CHECK_DELAY, onVideoUploaded);
        },
        function(err) {
            console.log(err);
        }
    );

    function onVideoUploaded(fileName) {
        DBVideo.createNewVideo().then(function(id) {
            var videoRootPath = Path.join(PUBLIC_PATH, id);
            var videosPath = Path.join(videoRootPath, 'videos');
            var imagesPath = Path.join(videoRootPath, 'images');

            var uploadFileName = 'upload' + Path.extname(fileName);

            fs.mkdirSync(videoRootPath);
            fs.mkdirSync(videosPath);
            fs.mkdirSync(imagesPath);

            fs.renameSync(Path.join(UPLOAD_PATH, fileName), Path.join(videoRootPath, uploadFileName));

            VideoUtils.startProcess(id, uploadFileName);
        }).catch(function(e) {
            console.log('EEEEE', e);
        });
    }
}

if (module.exports) {
    module.exports = start;
} else {
    start();
}
