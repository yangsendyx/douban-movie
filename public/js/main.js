
function PublicFn() {
	this.loading = $('div#loading');
}

PublicFn.prototype = {
	constructor: PublicFn,

	showLoading: function() {
		this.showTime = new Date().getTime();
		this.loading.css({ display: 'block', opacity: 1 });
	},

	hideLoading: function(callback, data, cb, set) {
		var This = this;
		var time = new Date().getTime();
		var diff = time - this.showTime;
		var dife = 0;

		if( diff < 400  ) dife = 400 - diff;
		
		// clearTimeout( This.hideFn );
		This.hideFn = setTimeout(function() {
			This.loading.css('opacity', 0);
			setTimeout(function() {
				This.loading.css('display', 'none');
				callback && callback( data, cb, set );
			}, 400);
		}, dife);
	}
};

var WINDOW_W = $(window).width();
var pb = new PublicFn();
var LEN = 10;
var COUNT = 0;
var TAG = '全部';
var SEARCH = '';

(function() {
	var $search = $('input#search');
	var $search_btn = $('#search_btn');
	var $more = $('#more');
	var $list_wrap = $('#list_wrap');
	var $tag_list = $('#tag_list');
	var $tag_btn = $('#tag_filter');
	var $detail_wrap = $('#detail_wrap');
	var $detail = $detail_wrap.find('#movie_detail');
	var $close = $detail_wrap.find('#close_detail');
	var tag_list_t;

	AjaxGet('/movie/tags', function(data) {
		data.unshift('全部');
		var con = [];
		$.each(data, function(i, el) {
			con.push('<li>'+el+'</li>');
		});
		con = con.join('');
		$tag_list.html( con );
		tag_list_t = $tag_list.outerHeight()+40;
		$tag_list.css({
			'transform': 'translateY(-'+tag_list_t+'px)',
			'-moz-transform': 'translateY(-'+tag_list_t+'px)',
			'-webkit-transform': 'translateY(-'+tag_list_t+'px)',
			'-o-transform': 'translateY(-'+tag_list_t+'px)'
		});
		setTimeout(function() { $tag_list.css('opacity', 1); }, 500);
	});

	init_style($search);
	$('div#ui_wrap').css('visibility', 'visible');

	randerList( $list_wrap, TAG, 0, LEN, SEARCH, true );
	$more.click(function() {
		COUNT++;
		randerList( $list_wrap, TAG, COUNT*LEN, LEN, SEARCH, false );
	});
	$search_btn.click(function() {
		var val = $search.val();
		if( !val ) return alert('亲，先输入点内容吧\n(●′ω`●)');
		SEARCH = val;
		TAG = '全部';
		COUNT = 0;
		randerList( $list_wrap, TAG, 0, LEN, SEARCH, true );
	});
	$tag_btn.click(function() {
		var bo = $(this).prop('bo');
		if( !bo ) {
			$(this).html('关闭标签筛选');
			$tag_list.css({
				'transform': 'translateY(-0px)',
				'-moz-transform': 'translateY(-0px)',
				'-webkit-transform': 'translateY(-0px)',
				'-o-transform': 'translateY(-0px)'
			});
		} else {
			$(this).html('标签筛选');
			$tag_list.css({
				'transform': 'translateY(-'+tag_list_t+'px)',
				'-moz-transform': 'translateY(-'+tag_list_t+'px)',
				'-webkit-transform': 'translateY(-'+tag_list_t+'px)',
				'-o-transform': 'translateY(-'+tag_list_t+'px)'
			});
		}
		$(this).prop('bo', !bo);
	});
	$tag_list.delegate('li', 'click', function() {
		COUNT = 0;
		TAG = $(this).html();
		SEARCH = '';
		$tag_btn.html('标签筛选').prop('bo', false);
		$tag_list.css({
			'transform': 'translateY(-'+tag_list_t+'px)',
			'-moz-transform': 'translateY(-'+tag_list_t+'px)',
			'-webkit-transform': 'translateY(-'+tag_list_t+'px)',
			'-o-transform': 'translateY(-'+tag_list_t+'px)'
		});
		randerList( $list_wrap, TAG, 0, LEN, SEARCH, true );
	});

	$close.click(function() {
		$detail_wrap.addClass('close_detail').removeClass('open_detail');
	});

	$list_wrap.delegate('.item', 'click', function() {
		var data = $(this).data('data');
		data.time = data.long;
		var html = template('tpl', data);
		$detail.html( html );
		$detail_wrap.children().hide();
		$detail_wrap.addClass('open_detail').removeClass('close_detail');
		setTimeout(function() {
			$detail_wrap.children().show();
		}, 200);
	});
})();

var TPL = '<img src="{{img}}" title="{{title}}">'+
			'<p>'+
				'<span title="{{title}}">{{title}}</span>'+
				'<span class="score">{{score}}</span>'+
			'</p>';

function randerList( $wrap, tag, start, length, search, clear ) {
	var $dom = $('<div>');
	var url = '/movie/list?tag='+tag+'&start='+start+'&length='+length+'&search='+search;
	AjaxGet(url, function(data) {
		if( !data.length ) return alert('没有更多数据了\n( >﹏<。)～');
		$.each(data, function(i, el) {
			var $div = $('<div class="item">');
			$div.data('data', el);
			var html = TPL.replace('{{img}}', el.img).replace(/\{\{title\}\}/g, el.title).replace('{{score}}', el.score);
			$div.html( html );
			$dom.append($div);
		});
		if( clear ) {
			COUNT = 0;
			$wrap.html('');
			$(window).scrollTop(0);
		}
		$wrap.append( $dom.children() );
	});
}

function init_style($search) {
	var $search_parent = $search.parent();
	$search.css({ marginLeft: ($search_parent.width()-$search.outerWidth())/2 - 30 });
	$search_parent.next('#search_fill').css('height', $search_parent.outerHeight());
	$search_parent.css('left', (WINDOW_W-$search_parent.outerWidth())/2);
}

function AjaxGet(url, cb) {
	pb.showLoading();
	$.ajax({
		url: url,
		dataType: 'json',
	})
	.done(function(data) {
		ajaxSuccess(data, cb);
	})
	.fail(function(event, request, settings) {
		ajaxError(event, request, settings);
	});
}

function ajaxSuccess(data, cb) {
	pb.hideLoading(function(data, cb) {
		if( data.code == 200 ) {
			if( cb ) cb(data.content);
		} else {
			alert(LAN.publicText.serverErr + '\n' + data.msg);
			console.log( LAN.publicText.serverErr + '\n' + data.msg );
		}
	}, data, cb);
}


function ajaxError(event, request, settings) {
	if( event.status == 401 ) {
		var page = window.location.href.match(/https*\:\/\/.+(\/.+\.html)/)[1];
		localStorage.setItem('before_page', page);
		window.location.href = '/';
	}
	pb.hideLoading(function(data, cb) {
		alert(LAN.publicText.requestFail);
		console.log( LAN.publicText.requestFail );
	}, event, request, settings);
}