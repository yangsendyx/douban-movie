
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
// var ObjectId = Schema.Types.ObjectId;

var MovieSchema = new Schema({
	douban_id: Number,
	title: String,
	img: String,
	detail_url: String,
	director: [{
		name: String,
		url: {
			type: String,
			default: ''
		}
	}],
	scenarist: [{
		name: String,
		url: {
			type: String,
			default: ''
		}
	}],
	actor: [{
		name: String,
		url: {
			type: String,
			default: ''
		}
	}],
	type: [{ type: String }],
	area: String,
	language: String,
	year: String,
	long: String,
	alias: String,
	score: Number,
	score_number: Number,
	summary: String,
	imdb: {
		name: String,
		url: {
			type: String,
			default: ''
		}
	},

	meta: {
		createAt: {
			type: Date,
			default: Date.now()
		},
		updateAt: {
			type: Date,
			default: Date.now()
		}
	}
});

MovieSchema.pre('save', function(next) {
	if( this.isNew ) {
		this.meta.createAt = this.meta.updateAt = Date.now();
	} else {
		this.meta.updateAt = Date.now();
	}
	next();
});

MovieSchema.statics = {
	findAll: function(cb) {
		return this.find({}).sort('meta.updateAt').exec(cb);
	},
	findByID: function(id, cb) {
		return this.findOne({_id: id}).exec(cb);
	}
};

module.exports = mongoose.model('movie', MovieSchema);