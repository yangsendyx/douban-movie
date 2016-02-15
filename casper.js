
var system = require('system');
var url = system.args[4];

var casper = require('casper').create({
	verbose: false,
	logLevel: 'debug',
	pageSettings: {
		loadImages: false,
		loadPlugins: false
	}
});


casper.start(url, function() {
    this.waitForSelector('#link-report', function() {
		var con = '<div id="info">';
		con += casper.evaluate(function(){
			return $('div#info').html() + '</div><div id="summer">' + $('div#link-report').html() + '</div>' + '<div id="sum">' + $('div#interest_sectl').html() + '</div>';
		});
	    this.echo( con );
    }, function() {
        this.die('该次等待页面关键元素加载失败').exit();
    }, 5000);
});

casper.run();