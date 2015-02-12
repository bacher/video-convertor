var Promise = require('es6-promise').Promise;

(new Promise(function(resolve, reject) {
    setTimeout(function() {
        throw 1;
    }, 1000);
})).then(function() {
    console.log('then');
}).then(function() {
    console.log('then2');
}).catch(function() {
    console.log('catch1')
});
