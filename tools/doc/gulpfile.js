/// <reference path="./types.d.ts" />

var path = require('path');
var fs = require('fs-extra');
var gulp = require('gulp');
var jsdoc = require('gulp-jsdoc3');
var del = require('del');

var outDir = '../../doc';
var outAllDir = './doc-all';
var jaguarTemplateId = 'jaguarjs-jsdoc';
// var docstrapTemplateId = 'ink-docstrap';

var preFile = 'libflac_pre.js';
var postFile = 'libflac_post.js';
var flacJoinedWrapperFile = 'libflac_pre-post.js';

var getFlacJoinedWrapperPath = function(){
	return path.normalize(path.join(__dirname, '..'));
};

var getSourceDir = function(){
	return path.normalize(path.join(__dirname, '..', '..'));
};

var getTemplatePath = function(templateId){
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

var getJsonConfig = function(fileName) {
	var filePath = path.isAbsolute(fileName)? fileName : path.resolve(__dirname+'/'+fileName);
	return JSON.parse(fs.readFileSync(filePath));
}

var createJoinedWrapperFile = function(sourceDir, callback){
	var preScript = path.resolve(sourceDir, preFile);
	var postScript = path.resolve(sourceDir, postFile);
	var targetFile = path.resolve(getFlacJoinedWrapperPath(), flacJoinedWrapperFile);

	Promise.all([
		fs.readFile(preScript, 'utf8'),
		fs.readFile(postScript, 'utf8')
	]).then(function(fileContents){
		return fs.writeFile(targetFile, fileContents.join('\r\n'), 'utf8');
	}).then(function(){
		callback();
	});
}

var cleanJsDoc = function(callback){

	var outPath = path.normalize(outDir);
	var outAllPath = path.normalize(outAllDir);
	del([outPath + '/**/*', outAllPath + '/**/*']).then(function(){
		callback();
	});
};

var genJsDoc = function(includePrivate, callback) {

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
	// config.opts.package = packageJsonFile;//DISABLED: will force writing to directory hierarchy <package name>/<version>/<docs>

	config.templates.openGraph.title += ' ' + pkgInfo.version;
	config.templates.meta.title += ' ' + pkgInfo.version;

	var srcDocFile = path.resolve(getFlacJoinedWrapperPath(), flacJoinedWrapperFile);

	gulp.src([srcDocFile], {read: false})
				.pipe(jsdoc(config, callback));
};

gulp.task('create_joined_wrapper', function(callback) {

	var srcDir = getSourceDir();
	createJoinedWrapperFile(srcDir, callback);
});

gulp.task('gen_jsdoc', gulp.series('create_joined_wrapper', function(callback) {

	genJsDoc(false, callback);
}));

gulp.task('gen_jsdoc_private', gulp.series('create_joined_wrapper', function(callback) {

	genJsDoc(true, callback);
}));

gulp.task('clean_jsdoc', function(callback) {

	cleanJsDoc(callback);
});

gulp.task('jsdoc', gulp.series('clean_jsdoc', gulp.parallel(['gen_jsdoc', 'gen_jsdoc_private'])));

gulp.task('default', gulp.series('clean_jsdoc', 'gen_jsdoc'));
