
var express = require('express');
var app = express();
var mongoose = require('mongoose');
var bodyParser = require('body-parser');

var dbUrl = 'mongodb://localhost:3300/douban';
mongoose.connect( dbUrl );
require('./spider');

app.disable('x-powered-by');
app.use( express.static(__dirname + '/public') );
app.use( bodyParser.urlencoded({extended: false}) );
app.use( bodyParser.json() );

require('./router')(app);
app.use(function(err, req, res, next) {
	console.error(err.stack);
	res.status(500).json({ code: 500, msg: '500 - Server Error.' });
}).use(function(req, res) {
	res.status(404).json({ code: 404, msg: '404 - Not Found.' });
});

app.listen('6200', function() {
	console.log( 'Express Server Started. content: '+app.get('env') );
});