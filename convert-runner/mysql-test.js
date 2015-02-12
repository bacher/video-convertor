
var mysql = require('mysql');

var connection = mysql.createConnection({
    host: 'localhost',
    //user: 'mysql',
    //password: '',
    database: 'test'
});

connection.connect();

connection.query('SELECT * FROM videos', function(err, rows) {
    console.log(rows);
});
