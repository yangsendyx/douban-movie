
var request = require('request');
var Redis = require('redis').createClient({
	host: '127.0.0.1',
	port: '6379'
});
var exec = require('child_process').exec;
var Movie = require('./model/data');
var PY = require('pinyin');
var cheerio = require('cheerio');
var nowTip = {};

var URI = 'http://movie.douban.com/j/search_subjects?type=movie&sort=recommend&page_limit=2000&page_start=0&tag=';
var URI2 = 'http://movie.douban.com/j/subject_abstract?subject_id=';
var TAGS = ['爱情', '喜剧', '动画', '剧情', '科幻', '动作', '经典', '悬疑', '青春', '犯罪', '惊悚', '文艺', '纪录片',	'搞笑',	'励志',	'恐怖', '战争',	'短片',	'魔幻',	'黑色幽默', '传记',	'情色',	'动画短片',	'感人', '暴力',	'音乐',	'家庭',	'童年', '黑帮',	'浪漫',	'女性',	'同志', '史诗',	'童话',	'烂片',	'cult'];
var LEN = TAGS.length;
var COUNT = 0;
var SAVEDATA = {};
var NAME_PY = {};


(function() {
	TAGS.forEach(function(el) {
		NAME_PY[toPY(el)] = el;
	});
})();

// 过滤规则 评分>6.5 && 评价人数>1000
var base_score = 6.5;
var base_people = 1000;

Redis.get('is_have_list', function(err, results) {
	if( err ) return console.log( err );
	if( !results ) return download_list();
	pop_data_spider();
});

function toPY( val ) {
	var len = val.length;
	var con = '';

	for( var i=0; i<len; i++ ) {
		var str = val.charAt(i);
		if( /[a-zA-Z]/.test(str) ) {
			con += str;
		} else {
			var result = PY(str, {
				style: PY.STYLE_NORMAL
			});
			con += result[0][0].charAt(0).toUpperCase();
		}
	}
	return con;
}

function download_list() {
	var count = 0, errCount = 0;
	for( var i=0; i<LEN; i++ ) {
		(function(index) {
			request(URI+encodeURIComponent(TAGS[index]), {timeout: 30000}, function(err, res, body) {
			    if( err ) {
			    	errCount++;
			    	return console.log( err + ' and index is:' + index + ' : ' + TAGS[index] );
			    }
			    if( res.statusCode !== 200 ) {
			    	errCount++;
			    	return console.log( 'request movie list error:' + res.statusCode + ' and index is:' + index );
			    }
			    var data;
			    try {
			    	data = JSON.parse(body);
			    } catch(err) {
			    	errCount++;
			    	return console.log( 'movie list data parse json error and index is:' + index );
			    }
			    if( !data.subjects ) {
			    	errCount++;
			    	return error('movie list not argv subjects and index is:' + index);
			    }
			    data = data.subjects;

			    var pushCount = 0;
			    var key = toPY( TAGS[index] );
			    data.forEach(function(el) {
			    	Redis.lpush(key, JSON.stringify(el), function(err) {
			    		pushCount++;
			    		if( pushCount == data.length ) {
			    			console.log( 'success:' + TAGS[index] );
			    			count++;
			    			if( count + errCount == LEN ) {
			    				Redis.set('is_have_list', 1);
			    				console.log('movie list is ok.');
			    				// pop_data_spider();
			    			}
			    		}
			    	});
			    });
			});
		})(i);
	}
}

function pop_data_spider() {
	var type_index = (COUNT++) % LEN;
	var key = toPY( TAGS[type_index] );
	// console.log( '爬取' + TAGS[type_index] + '的数据' );
	Redis.lindex(key, -1, function(err, results) {
		if( !results ) {
			console.log( TAGS[type_index] + '列表已被爬取完毕。' );
			return pop_data_spider();
		}
		nowTip = JSON.parse(results);
		nowTip.key = key;
		if( parseFloat(nowTip.rate) < base_score ) {
			console.log( nowTip.title+' from '+TAGS[type_index]+' failed. number: '+nowTip.rate + ' score to low.' );
			pop_redis_data(key);
			return pop_data_spider();
		}
		Redis.hget('success_failed_list', nowTip.id, function(err, results) {
			if( err ) {
				console.log( err );
				return get_detail_data();
			}
			if( results ) {
				var pyArr = results.match(/.+from\s([A-Z]+)\s.+/);
				results = pyArr && pyArr.length && pyArr.length >= 2 && /^[A-Z]+$/.test(pyArr[1]) ? 
					results.replace('from '+pyArr[1], 'from '+NAME_PY[pyArr[1]]) : results;
				// log标记点
				console.log( results + '. from pass list.' );
				pop_redis_data(key);
				return pop_data_spider();
			} else {
				get_detail_data();
			}
		});
	});
}

function get_detail_data() {
	// console.log(URI2 + nowTip.id);
	request(URI2 + nowTip.id, function(err, res, body) {
		if( err ) {
			console.log( err );
	    	return delay_loop();
	    }
	    if( res.statusCode !== 200 ) {
	    	console.log( 'request movie detail error:' + res.statusCode );
	    	return delay_loop();
	    }
	    var data;
	    try {
	    	data = JSON.parse(body);
	    } catch(err) {
	    	console.log( 'movie detail data parse json error' );
	    	return delay_loop();
	    }
	    if( !data.subject ) {
	    	console.log('movie detail not argv subjects');
	    	return delay_loop();
	    }
	    data = data.subject;

	    SAVEDATA = {};
	    SAVEDATA.douban_id = nowTip.id;
	    SAVEDATA.title = data.title;
	    SAVEDATA.img = nowTip.cover;
	    SAVEDATA.detail_url = nowTip.url;
	    SAVEDATA.type = data.types;
	    SAVEDATA.area = data.region;
	    SAVEDATA.year = data.release_year;
	    SAVEDATA.long = data.duration;
	    SAVEDATA.score = nowTip.rate;

	    capture( nowTip.url );
	});

	function delay_loop() {
		setTimeout(get_detail_data, 10000);
	}
}

// capture('http://movie.douban.com/subject/26277313/');
function capture(url) {
	var ls = exec('casperjs casper.js '+url, function(err, stdout, stderr) {
		if( err ) {
			console.log( 'exec Error:\n'+err );
			return pop_data_spider();
		}
		if( stderr ) {
			console.log( stderr );
			return pop_data_spider();
		}
		parse_dom( stdout );
	});

	// console.log( ls.pid );
	/*ls.on('close', function(data) {
		console.log('子进程关闭');
	});*/
}

function parse_dom(html) {
	var $ = cheerio.load('<div>'+html+'</div>', {decodeEntities: false});
	var $info = $('#info');
	var $summer = $('#summer');
	var $sum = $('#sum');

	SAVEDATA.director = []; SAVEDATA.scenarist = []; SAVEDATA.actor = [];
	var $spans = $info.find('>span');
	try {
		$spans.eq(0).find('span.attrs a').each(function(i, el) {
			SAVEDATA.director.push({
				name: $(this).html(),
				url: $(this).attr('href')
			});
		});
		$spans.eq(1).find('span.attrs a').each(function(i, el) {
			SAVEDATA.scenarist.push({
				name: $(this).html(),
				url: $(this).attr('href')
			});
		});
		$spans.eq(2).find('span.attrs a').each(function(i, el) {
			if( $(this).html() != '更多' ) {
				SAVEDATA.actor.push({
					name: $(this).html(),
					url: $(this).attr('href')
				});
			}
		});
		var info_html = $info.html();
		var languageArr = info_html.match(/语言\:\<\/span\>(.+)\<br\>/);
		SAVEDATA.language = languageArr && languageArr.length && languageArr.length >= 2 ? languageArr[1] : '';
		var aliasArr = info_html.match(/又名\:\<\/span\>(.+)\<br\>/);
		SAVEDATA.alias = aliasArr && aliasArr.length && aliasArr.length >= 2 ? aliasArr[1] : '';
		SAVEDATA.imdb = {};
		var $imdb_dom = $spans.filter('.pl').last().next('a');
		SAVEDATA.imdb.name = $imdb_dom.html() || '';
		SAVEDATA.imdb.url = $imdb_dom.attr('href') || '';
		SAVEDATA.summary = $summer.find('span.all.hidden').html() || $summer.find('span.short span').html();
		SAVEDATA.score_number = $sum.find('div.rating_right a span').text();
	} catch(err) {
		console.log( err );
		console.log( SAVEDATA.title );
		SAVEDATA.score_number = 1;
	}

	pop_redis_data(nowTip.key, function() {
		if( parseInt(SAVEDATA.score_number) > base_people ) {
			Movie.findOne({ douban_id: SAVEDATA.douban_id }).exec(function(err, results) {
				if( results ) {
					// log标记点
					console.log( SAVEDATA.title + ' from '+ NAME_PY[nowTip.key] +' exits.' );
					return next_spider();
				}

				var movie_tags = {};
				SAVEDATA.type.forEach(function(el) {
					movie_tags[el] = 1;
				});
				Redis.hmset('movie_tags', movie_tags);

				new Movie(SAVEDATA).save( function(err, results) {
					if( err ) console.log( err );
					next_spider();
					var con = SAVEDATA.title+' from '+NAME_PY[nowTip.key]+' success. number: '+SAVEDATA.score+' | '+SAVEDATA.score_number;
					Redis.hset('success_failed_list', SAVEDATA.douban_id, con);
					// log标记点
					console.log( con );
				});
			});
		} else {
			next_spider();
			var con = SAVEDATA.title+' from '+NAME_PY[nowTip.key]+' failed. number: '+SAVEDATA.score+' | '+SAVEDATA.score_number;
			Redis.hset('success_failed_list', SAVEDATA.douban_id, con);
			// log标记点
			console.log( con );
		}
	});

	function next_spider() {
		setTimeout(pop_data_spider, 20000);
	}
}

function pop_redis_data(key, cb) {
	Redis.rpop(key, function(err) {
		if( cb ) cb();
	});
}