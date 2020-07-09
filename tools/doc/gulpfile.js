/// <reference path="./types.d.ts" />

var path = require('path');
var fs = require('fs-extra');
var exec = require('child_process').exec;
var gulp = require('gulp');
var logGulp = require('fancy-log');
var jsdoc = require('gulp-jsdoc3');
var del = require('del');

var dtsGen = require('../typings-gen');
dtsGen.setLogFunc(logGulp);

var outDir = '../../doc';
var outAllDir = './doc-all';
var jaguarTemplateId = 'jaguarjs-jsdoc';
// var docstrapTemplateId = 'ink-docstrap';
var targetTypingsDir = '../../dist';

var preFile = 'libflac_pre.js';
var postFile = 'libflac_post.js';
var flacJoinedWrapperFile = 'libflac_pre-post.js';

var flacJsDocJsonFile = 'libflac_jsdoc.json';
var typingsFile = 'index.d.ts';

var tsUtilsSrcDir = '../../src';
var tsUtilsOutDir = '../../lib';
var tscCmd = '../test/node_modules/.bin/tsc';
var webpackCmd = '../test/node_modules/.bin/webpack';

var getFlacJoinedWrapperPath = function(){
	return path.normalize(path.join(__dirname, '..', 'temp'));
};

function getSourceDir(){
	return path.normalize(path.join(__dirname, '..', '..'));
};

function normalizeGlob(fpath){
	return path.normalize(fpath).replace(/\\/g, '/');
}

function getTemplatePath(templateId){
	try {
		return path.dirname(require.resolve(templateId));
	} catch(err){
		var pkgPath = path.normalize(__dirname+'/node_modules/'+templateId);
		if(!fs.existsSync(pkgPath)){
			throw new Error('Could not find template package for '+templateId);
		}
		return pkgPath;
	}
};

function getJsonConfig(fileName) {
	var filePath = path.isAbsolute(fileName)? fileName : path.resolve(__dirname+'/'+fileName);
	return JSON.parse(fs.readFileSync(filePath));
}

function writeJsDocJsonToFile(callback){
	var jsonData = [];
	var handleJsonOutput = function(data){
		jsonData.push(data);
	};
	var writeJsonOutput = function(dataList, cb){
		var filePath = path.resolve(getFlacJoinedWrapperPath(), flacJsDocJsonFile);
		var ws = fs.createWriteStream(filePath);
		ws.on('finish', cb);
		ws.on('error', cb);
		var d;
		for(var i=0, size = dataList.length; i < size; ++i){
			d = dataList[i]
			try {
				//NOTE jsdoc prints the JSON to stdout, so only write data that
				//    is parseble as JSON to file, otherwise just ignore
				JSON.parse(d);
				ws.write(d);
			} catch(e){}
		}
		ws.end();
	};

	var __cb = callback;
	callback = function(){
		var args = Array.from(arguments);
		process.stdout.write = __write;
		writeJsonOutput(jsonData, function(err){
			if(err){
				return __cb(err);
			}
			__cb.apply(null, args);
		});
	}
	var __write = process.stdout.write;
	function write() {
		if(process.env.verbose || process.env.npm_config_loglevel === 'verbose'){
			__write.apply(process.stdout, arguments);
		}
		handleJsonOutput.apply(null, arguments);
	}
	process.stdout.write = write;

	return callback;
}

function generateTypings(callback){

	var jsDocJsonPath = path.resolve(getFlacJoinedWrapperPath(), flacJsDocJsonFile);
	var jsDocJson = getJsonConfig(jsDocJsonPath);
	var typingsPath = path.resolve(getFlacJoinedWrapperPath(), typingsFile);

	dtsGen.generateDeclaration(jsDocJson, typingsPath, callback);
};

function createJoinedWrapperFile(sourceDir, callback){
	var preScript = path.resolve(sourceDir, preFile);
	var postScript = path.resolve(sourceDir, postFile);
	var targetFile = path.resolve(getFlacJoinedWrapperPath(), flacJoinedWrapperFile);

	Promise.all([
		fs.ensureDir(path.resolve(getFlacJoinedWrapperPath())),
		fs.readFile(preScript, 'utf8'),
		fs.readFile(postScript, 'utf8')
	]).then(function(fileContents){
		return fs.writeFile(targetFile, fileContents.join('\r\n'), 'utf8');
	}).then(function(){
		callback();
	});
}

function cleanJsDoc(callback){

	var outPath = normalizeGlob(outDir);
	var outAllPath = normalizeGlob(outAllDir);
	del([outPath + '/**/*', outAllPath + '/**/*'], {force: true}).then(function(){
		callback();
	});
};

function genJsDoc(includePrivate, generateJsonOutput, callback) {

	var config = getJsonConfig('conf-jsdoc3.json');

	var srcPath = path.resolve(getSourceDir());
	var outPath = includePrivate? path.resolve(outAllDir) : path.resolve(outDir);

	var templateId = jaguarTemplateId;
	var templatePath = getTemplatePath(templateId);

	var readmeFile = path.resolve(srcPath + '/README.md');
	var packageJsonFile = path.resolve(srcPath + '/package.json');

	var pkgInfo = getJsonConfig(packageJsonFile);

	config.opts.destination = outPath;
	config.opts.private = !!includePrivate;
	config.opts.template = templatePath;
	config.opts.readme = readmeFile;
	config.opts.explain = !!generateJsonOutput;
	// config.opts.package = packageJsonFile;//DISABLED: will force writing to directory hierarchy <package name>/<version>/<docs>

	config.templates.openGraph.title += ' ' + pkgInfo.version;
	config.templates.meta.title += ' ' + pkgInfo.version;

	if(generateJsonOutput){
		callback = writeJsDocJsonToFile(callback);
	}

	var srcDocFile = path.resolve(getFlacJoinedWrapperPath(), flacJoinedWrapperFile);

	gulp.src([srcDocFile], {read: false})
				.pipe(jsdoc(config, callback));
};

gulp.task('create_joined_wrapper', function(callback) {

	var srcDir = getSourceDir();
	createJoinedWrapperFile(srcDir, callback);
});

gulp.task('gen_jsdoc', gulp.series('create_joined_wrapper', function(callback) {

	genJsDoc(false, false, callback);
}));

gulp.task('gen_jsdoc_private', gulp.series('create_joined_wrapper', function(callback) {

	genJsDoc(true, false, callback);
}));

gulp.task('gen_jsdoc_json', gulp.series('create_joined_wrapper', function(callback) {

	genJsDoc(false, true, callback);
}));

gulp.task('clean_jsdoc', function(callback) {

	cleanJsDoc(callback);
});

gulp.task('gen_typings', gulp.series('gen_jsdoc_json', function(callback) {

	generateTypings(function(err){
		if(err){
			return callback(err);
		}
		var genTypingsFile = path.resolve(getFlacJoinedWrapperPath(), typingsFile);
		fs.copy(genTypingsFile, path.resolve(targetTypingsDir, typingsFile), callback)
	});
}));

gulp.task('build_ts_utils', function(cb) {
	exec('"'+tscCmd+'" --project "'+tsUtilsSrcDir+'/tsconfig.json"', function(err, stdout) {
		if(err) console.error(stdout);
		cb(err);
	});
});

gulp.task('clean_ts_utils', function(cb) {

	var outPath = normalizeGlob(tsUtilsOutDir);
	del([outPath + '/**/*'], {force: true}).then(function(){
		cb();
	});
});

gulp.task('build_ts_example', function(cb) {
	const cwd = path.dirname(path.dirname(path.dirname(webpackCmd)));
	exec('"'+webpackCmd+'" --config "'+tsUtilsSrcDir+'/webpack.config.example.js"', {cwd: cwd}, function(err, stdout) {
		if(err) console.error(stdout);
		cb(err);
	});
});

gulp.task('ts_utils', gulp.series('clean_ts_utils', 'build_ts_utils'));


gulp.task('jsdoc_all', gulp.series('clean_jsdoc', gulp.parallel(['gen_jsdoc', 'gen_jsdoc_private', 'gen_jsdoc_json'])));

gulp.task('jsdoc', gulp.series('clean_jsdoc', 'gen_jsdoc'));

gulp.task('jsdoc_and_json', gulp.parallel(['jsdoc', 'gen_jsdoc_json']));


gulp.task('jsdoc_and_ts', gulp.parallel(['jsdoc', 'gen_typings', 'ts_utils', 'build_ts_example']));

gulp.task('default', gulp.series('jsdoc'));
