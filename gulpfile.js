const gulp = require('gulp');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const streamqueue  = require('streamqueue');
// -----------------------------------------------------------
// minify css
gulp.task('css', function() {
  return gulp.src('stylesheets/*.css')
    .pipe(concat('app.min.css'))
    .pipe(gulp.dest('public/stylesheets'));
});
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
    .pipe(uglify())
    .pipe(gulp.dest('public/javascripts'));
});
// -----------------------------------------------------------
// Default Task
gulp.task('default', gulp.series(['js', 'css']));
// -----------------------------------------------------------
