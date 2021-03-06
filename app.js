// --------------------------------------------------------------------------------------

const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const database = require( './db' );

// --------------------------------------------------------------------------------------

var app = express();

// --------------------------------------------------------------------------------------
// disable powered by header
app.disable('x-powered-by')

// connect to the database
database.connect();

// --------------------------------------------------------------------------------------
// Make our db accessible to our router
app.use(function(req, res, next){
  req.db = database;
  next();
});
// --------------------------------------------------------------------------------------

var index = require('./routes/index');

// --------------------------------------------------------------------------------------

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// --------------------------------------------------------------------------------------
// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// --------------------------------------------------------------------------------------
app.use('/', index);
app.use('/export', express.static('public/export'));
app.use('/.well-known', express.static('public/.well-known'));

// --------------------------------------------------------------------------------------
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Stránka nenalezena');
  err.status = 404;
  next(err);
});

// --------------------------------------------------------------------------------------
// set up cron tasks
require('./cron')(database);

// --------------------------------------------------------------------------------------
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});
// --------------------------------------------------------------------------------------

module.exports = app;
