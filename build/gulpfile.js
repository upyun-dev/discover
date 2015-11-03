var gulp = require('gulp');
var jscs = require('gulp-jscs');
var jshint = require('gulp-jshint');

var paths = {
  scripts: ['**/*.js', '!coverage/**/*.js', '!node_modules/**/*.js']
};
gulp.task('jshint', function() {
  return gulp.src(paths.scripts)
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('jscs', function() {
  return gulp.src(paths.scripts)
    .pipe(jscs())
    .pipe(jscs.reporter());
});

gulp.task('default', ['jshint', 'jscs']);
