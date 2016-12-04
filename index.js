var fs = require('fs');
var path = require('path');
var through = require('through2');
var gutil = require('gulp-util');
var babel = require('babel-core');
var sass = require('node-sass');
var File = require('vinyl')

var defaultOptions = {
	weex: '.weex',
	scss: '.scss',
	es6: '.es6',
	babel_options: {},
	scss_options: {},
};
var moduleName = 'gulp-weex-scss-es6';

function gulpWeexScssEs6(options) {
	options = options || {};
	Object.keys(defaultOptions).forEach(function(key){
		if (!(key in options)) {
			options[key] = defaultOptions[key];
		}
	});
	var reg = new RegExp('^(.+\.)('+options.weex+'|'+options.scss+'|'+options.es6+')$');

	return through.obj(function(file, enc, callback){
		if (file.isStream()) {
			this.emit('error', new gutil.PluginError(moduleName, 'Streams are not supported!'));
		  callback();
		}
		else if (file.isNull())
		  callback(null, file); // Do nothing if no contents
		else {
		  try {
		  	var me = this;
		  	var weexFile = file.path.replace(reg, '$1'+options.weex)
		  	var scssFile = file.path.replace(reg, '$1'+options.scss)
		  	var es6File = file.path.replace(reg, '$1'+options.es6)

		  	Promise.all([
		  		new Promise(function(resolve, reject) {
		  			fs.stat(weexFile, function(err) {
		  				if(err) return resolve('');
		  				fs.readFile(weexFile, function(err, content) {
			  				if (err) return reject(err);
			  				return resolve(content);
			  			});
		  			});
		  		}),
		  		new Promise(function(resolve, reject) {
		  			fs.stat(scssFile, function(err) {
		  				if(err) return resolve('');
		  				options.scss_options.file = scssFile;
			  			sass.render(options.scss_options, function(err, result) {
			  				if (err) return reject(err);
			  				return resolve(result.css);
			  			});
		  			});
		  		}),
		  		new Promise(function(resolve, reject) {
		  			fs.stat(es6File, function(err) {
		  				if(err) return resolve('');
		  				babel.transformFile(es6File, options.babel_options, function(err, result) {
			  				if (err) return reject(err);
			  				return resolve(result.code);
			  			});	
		  			});
		  		}),
		  	]).then(function(results){
		  		var weContent = '<template>\n'+
		  			results[0] +
		  			'\n</template>\n'+
		  			'<style>\n'+
		  			results[1] +
		  			'\n</style>\n'+
		  			'<script>\n'+
		  			results[2] +
		  			'\n</script>\n';
		  		var weFile = new File(file);
		  		weFile.contents = new Buffer(weContent);
		  		me.push(weFile);
		  		callback();
		  	}).catch(function(err){
		  		me.emit('error', err);
		    	callback();
		  	})
		  } catch(err) {
		  	this.emit('error', err);
		    callback();
		  }
		}
	});
};

gulpWeexScssEs6.logError = function logError(error) {
	var message = new gutil.PluginError(moduleName, error).toString();
	process.stderr.write(message + '\n');
	this.emit('end');
};

module.exports = gulpWeexScssEs6;