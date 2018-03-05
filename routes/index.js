const express = require('express');
const router = express.Router();
const async = require('async');
const ldap = require('ldapjs');
const secrets = require('../config/secrets.js');
const config = require('../config/config.js');
const ldap_sync = require('../cron/ldap_sync.js');
const assert = require('assert');
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
  var stream = req.db.realms.aggregate([{ $group : { _id : { "dn" : "$dn" },
                             // additional fields
                             connection_status : { $last : "$connection_status" },
                             last_change : { $last : "$last_change" },
                             managers : { $last : "$managers" },
                             realms : { $last : "$realms" },
                             testing_id : { $last : "$testing_id" },
                             register_timestamp : { $last : "$register_timestamp" },
                             connection_timestamp : { $last : "$connection_timestamp" },
                             type : { $last : "$type" },
                             xml_url : { $last : "$xml_url" },
                             radius : { $last : "$radius" },
                             org_name : { $last : "$org_name" },
                             org_active : { $last : "$org_active" },
                             appointment : { $last : "$appointment" },
                           } } ])
                           //{ $sort : { last_change : -1 } },    // sort by last_change timestamp
                           //{ $limit : 1 }])                       // get only the newest record
  .cursor({ batchSize: 1000 }).exec();


  stream.on('error', function (err) {
    if(err)
      console.log(err);
  });

  stream.on('data', function(item) {
    data.push(item);
  });

  stream.on('end', function(items) {
    get_manager_names(req, res, data, "index", 'Přehled organizací zapojených do infrastruktury eduroam.cz', respond);  // TODO - dvojjazycnost
  });
}
// --------------------------------------------------------------------------------------
// get manager names
// --------------------------------------------------------------------------------------
function get_manager_names(req, res, data, view_name, title, done)
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

      done(res, data, view_name, title);
  });
}
// --------------------------------------------------------------------------------------
// respond to user
// --------------------------------------------------------------------------------------
function respond(res, data, view_name, title)
{
  res.render(view_name,
  {
    title: title,
    data: data
  });
}
// --------------------------------------------------------------------------------------
// get specific org
// --------------------------------------------------------------------------------------
router.get('/:org', function(req, res, next) {
  get_org(req, res);
});
// --------------------------------------------------------------------------------------
// get organization
// --------------------------------------------------------------------------------------
function get_org(req, res)
{
  var client = ldap.createClient({
    url: 'ldaps://' + config.ldap_host
  });

  client.bind(config.bind_dn, secrets.ldap_pass, function(err) {
    assert.ifError(err)
  })

  ldap_sync.search_and_update_realms(client, req.db, "cn=" + req.params.org + "," +config.search_base_realms,      // only specific realm
    function() {
      var data = [];
      var stream = req.db.realms.aggregate([{ $match : { "realms" : req.params.org } },        // match item by dn
                               { $sort : { last_change : -1 } },    // sort by last_change timestamp
                               //{ $limit : 1 }                     // get only the newest record
      ]).cursor({ batchSize: 1000 }).exec();

      stream.on('error', function (err) {
        if(err)
          console.log(err);
      });

      stream.on('data', function(item) {
        data.push(item);
      });

      stream.on('end', function(items) {
        if(data.length == 0) {        // nothing matched
          res.status(404);
          //res.render('no_org', { title : 'Organizace nenalezena' });
          get_manager_names(req, res, data, 'org', 'Organizace nenalezena', respond);
        }
        else        // org found
          get_manager_names(req, res, data, 'org', data.org_name, respond);
      });
    });
}
// --------------------------------------------------------------------------------------
module.exports = router;
