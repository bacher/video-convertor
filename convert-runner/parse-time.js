'use strict';

module.exports = {
    parseTime: function(timeString) {

        var durationChunks = timeString.split(/[\.:]/).map(Number);

        return (
            durationChunks[0] * 60 * 60 +
            durationChunks[1] * 60 +
            durationChunks[2] +
            (durationChunks[3] > 50 ? 1 : 0)
        );
    }
};
