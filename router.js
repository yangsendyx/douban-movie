
var Movie = require('./model/data');
var Redis = require('redis').createClient({
	host: '127.0.0.1',
	port: '6379'
});

module.exports = function(app) {

	app.get('/movie/list', function(req, res, next) {
		var start = req.query.start || 0;
		var length = req.query.length || 15;
		var tag = req.query.tag || '全部';
		var search = req.query.search || '';

		var query = {};
		if( tag !== '全部' && !search ) query.type = tag;
		if( search ) {
			var reg = new RegExp(search, 'g');
			query.title = reg;
			query.alias = reg;
		}
		Movie.find( query )
		.sort({ _id: 1 })
		.skip( start )
		.limit( length )
		.exec(function(err, results) {
			if( err ) {
				console.error('[new Error line] =========================');
				console.error( new Date() );
				console.error( err );
				return res.json({ code: 500, msg: 'query mongodb error' });
			}
			res.json({ code: 200, content: results });
		});
	});

	app.get('/movie/tags', function(req, res, next) {
		Redis.hgetall('movie_tags', function(err, results) {
			if( err ) {
				console.error('[new Error line] =========================');
				console.error( new Date() );
				console.error( err );
				return res.json({ code: 500, msg: 'query redis error' });
			}
			var resData = [];
			for( var key in results ) {
				resData.push(key);
			}
			res.json({ code: 200, content: resData });
		});
	});
};