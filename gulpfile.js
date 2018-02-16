// -----------------------------------------------------------
const gulp = require('gulp');
//const pug = require('gulp-pug');
//const css = require('gulp-clean-css');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const streamqueue  = require('streamqueue');
// -----------------------------------------------------------
//// minify css
//gulp.task('css', function() {
//  return gulp.src('stylesheets/*.css')
//    .pipe(concat('app.min.css'))
//    .pipe(css({compatibility: 'ie8'}))
//    .pipe(gulp.dest('public/stylesheets'));
//});
// -----------------------------------------------------------
// Concatenate & Minify JS
gulp.task('js', function() {
  return streamqueue({ objectMode: true },
    gulp.src('javascripts/angular/angular_1.5.8.min.js'),
    gulp.src('javascripts/angular/angular-ui-router.min.js'),
    gulp.src('javascripts/angular/main.js'),
    gulp.src('javascripts/angular/controllers.js'),
    gulp.src('javascripts/angular/routes.js'),
    gulp.src('javascripts/jquery/jquery.min.js'),
    gulp.src('javascripts/*.js')
  )
    .pipe(concat('app.js'))
    //.pipe(uglify())
    .pipe(gulp.dest('public/javascripts'));
});
// -----------------------------------------------------------
//gulp.task('views', function buildHTML() {
//  return gulp.src('views/templates/*.pug')
//    .pipe(pug({}))
//    .pipe(gulp.dest('public/partials'))
//});
// -----------------------------------------------------------
// Default Task
//gulp.task('default', gulp.series(['views', 'js', 'css']));
gulp.task('default', gulp.series(['js']));
// -----------------------------------------------------------
