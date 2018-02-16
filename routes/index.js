const express = require('express');
const router = express.Router();
const async = require('async');
// --------------------------------------------------------------------------------------
/* GET home page. */
router.get('/', function(req, res, next) {
  get_inst_list(req, res);
});
// --------------------------------------------------------------------------------------
// get institution list
// --------------------------------------------------------------------------------------
function get_inst_list(req, res)
{
  var data = [];
  var stream = req.db.realms.find({},
  { _id : 0, connection_status : 1, last_change : 1, managers : 1, realms : 1, testing_id : 1, register_timestamp : 1, connection_timestamp : 1, type : 1,
    xml_url : 1, org_name : 1 })
  .cursor({ batchSize: 1000 });

  stream.on('error', function (err) {
    if(err)
      console.log(err);
  });

  stream.on('data', function(item) {
    data.push(item.toObject());		// get "raw" object not mongoose object
  });

  stream.on('end', function(items) {
    get_manager_names(req, res, data);
  });
}
// --------------------------------------------------------------------------------------
// get manager names
// --------------------------------------------------------------------------------------
function get_manager_names(req, res, data)
{
  async.eachOf(data, function(item, index, callback1) {
    data[index]['managers_names'] = [];

    async.each(item['managers'], function(manager, callback2) {

      var stream = req.db.managers.find({ "dn" : manager },		// search for specific manager by dn
      { _id : 0, name : 1 }).cursor({ batchSize: 1000 });

      stream.on('error', function (err) {
	if(err)
	  console.log(err);
      });

      stream.on('data', function(db_item) {
	data[index]['managers_names'].push(db_item['name']);
      });

      stream.on('end', function(items) {
	callback2();		// item processed
      });

    }, function(err) {
      if(err)
	console.log(err);

      data[index]['managers'] = data[index]['managers_names'];
      callback1();		// all items in inner loop are done
    });
  }, function(err) {
      if(err)
	console.log(err);

      // outer loop is done
      res.render('index',
      {
        title: 'Seznam připojovaných organizací', 		// TODO - dvojjazycnost
        data: data
      });
  });
}
// --------------------------------------------------------------------------------------
module.exports = router;
