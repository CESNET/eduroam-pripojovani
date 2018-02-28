const ldap = require('ldapjs');
const async = require('async');
const assert = require('assert');
const secrets = require('../config/secrets.js');
const config = require('../config/config.js');
const ldap2date = require('ldap2date');
// --------------------------------------------------------------------------------------
var exp = {}
// --------------------------------------------------------------------------------------
// process old data
// --------------------------------------------------------------------------------------
exp.synchronize_data = function (database) {
  var client = ldap.createClient({
    url: 'ldaps://' + config.ldap_host
  });

  client.bind(config.bind_dn, secrets.ldap_pass, function(err) {
    assert.ifError(err)
  })

  exp.search_and_update_realms(client, database, config.search_base_realms);
};
// --------------------------------------------------------------------------------------
// search ldap for realms
// --------------------------------------------------------------------------------------
exp.search_and_update_realms = function (client, database, search_base, callback)
{
  // items which are registered for each realm
  var items = [ 'dn', 'cn', 'eduroamConnectionStatus', 'eduroamMemberType', 'manager', 'eduroamTestingId', 'labeledUri', 'oPointer', 'eduroamConnected', 'eduroamRegistered' ];
  var ret = [];

  var opts = {
    filter: '(objectclass=eduroamRealm)',
    scope: 'sub',
    attributes: items
  };

  client.search(search_base, opts, function(err, res) {
    assert.ifError(err);

    res.on('searchEntry', function(entry) {
      var dict = {};
      dict.managers = [];
      dict.realms = [];

      if(typeof(entry.object['cn']) === 'object')	// multiple realms
        dict.realms = entry.object['cn']
      else  // one realm only
        dict.realms.push(entry.object['cn'])

      dict.dn = entry.object['dn'];
      dict.connection_status = entry.object['eduroamConnectionStatus'];
      dict.type = entry.object['eduroamMemberType'];

      if(typeof(entry.object['manager']) === 'object')	// multiple managers
        dict.managers = entry.object['manager'];
      else  // one manager only
        dict.managers.push(entry.object['manager']);

      dict.testing_id = Boolean(entry.object['eduroamTestingId']);
      dict.xml_url = Boolean(entry.object['labeledUri']);

      if(entry.object['oPointer'])
        dict.org_ptr = entry.object['oPointer'];

      if(entry.object['eduroamConnected'])
        dict.connection_timestamp = ldap2date.parse(entry.object['eduroamConnected']);

      if(entry.object['eduroamRegistered'])
        dict.register_timestamp = ldap2date.parse(entry.object['eduroamRegistered']);

      dict.last_change = new Date();

      ret.push(dict);		// prepare results for database update
    });

    res.on('error', function(err) {
      console.error('error: ' + err.message);
    });

    res.on('end', function(result) {
      search_radius_servers(client, ret, database, function() {
        search_orgs(client, ret, database, function() {
          search_managers(client, ret, database, function() {
            update_realms(ret, database, function() {
              if(callback)
                callback();
            });
          });
        });
      });
    });
  });
}
// --------------------------------------------------------------------------------------
// update realms collection in database
// --------------------------------------------------------------------------------------
function update_realms(data, database, done)
{
  async.each(data, function(item, callback) {
    database.realms.aggregate([{ $match : { dn: item.dn } },        // match item by dn
                               { $sort : { last_change : -1 } },    // sort by last_change timestamp
                               { $limit : 1 }                       // get only the newest record
    ],
      function(err, results) {

        if(results.length > 0) {   // something found

          // compare record for insertion and the database record, if they differ, insert record
          if(compare_records(results[0], item)) {   // records differ

            database.realms.update({ dn : item.dn, last_change : item.last_change }, item, { upsert : true },        // nothing matches search criteria, this is actually an insert
            function(err, result) {
              if(err)
                console.error(err);
              callback();
            });
          }
          else {        // records do not differ, not necessary to update
            callback();
          }
        }
        else {                     // nothing found, insert new data
          database.realms.update({ dn : item.dn, last_change : item.last_change }, item, { upsert : true },        // nothing matches search criteria, this is actually an insert
          function(err, result) {
            if(err)
              console.error(err);
            callback();
          });
        }
    });
  }, function(err) {
      if(err)
        console.log(err);
      done();
  });
}
// --------------------------------------------------------------------------------------
// compare two records
// --------------------------------------------------------------------------------------
function compare_records(a, b)
{
  // TODO - managers?
  // TODO - realms?
  // TODO - dalsi veci?
  var items = ["connection_status", "connection_timestamp", "radius", "register_timestamp", "testing_id", "type", "xml_url" ]

  for(var i in items) {
    if(a[items[i]] != undefined && b[items[i]] != undefined) {      //  both are defined
      if(a[items[i]].toString() != b[items[i]].toString()) {        // convert to string and the compare - date comparsion issues
        return true;     // records differ
      }
   }
    else {
      if(a[items[i]] == undefined && b[items[i]] == undefined)      //  both are UNdefined
        return false;        // records do NOT differ

      return true;     // records differ
    }
  }

  return false;        // records do NOT differ
}
// --------------------------------------------------------------------------------------
// search ldap for managers
// --------------------------------------------------------------------------------------
function search_managers(client, data, database, done)
{
  var opts = {
    scope: 'sub',
    attributes: [ 'uid', 'cn' ]
  };
  var ret = [];

  async.each(data, function(item, callback1) {      // iterate data

    async.each(item['managers'], function(item, callback2) {  // iterate managers for one item

      client.search(item, opts, function(err, res) {
        assert.ifError(err);

        res.on('searchEntry', function(entry) {
          var dict = {};
          dict.dn = entry.object.dn;
          dict.name = entry.object.cn;
          ret.push(dict);		// prepare results for database update
        });

        res.on('error', function(err) {
          console.error('error: ' + err.message);
        });

        res.on('end', function(result) {
          callback2();       // item done
        });
      });

    }, function(err) {
        if(err)
          console.log(err);
        callback1();    // all managers for one item done
    });

  }, function(err) {
      if(err)
        console.log(err);
      update_managers(ret, database, done);   // all items done
  });
}
// --------------------------------------------------------------------------------------
// update managers collection in database
// --------------------------------------------------------------------------------------
function update_managers(data, database, done)
{
  async.each(data, function(item, callback) {
    database.managers.update({ dn: item.dn }, item, { upsert : true },
    function(err, result) {
      // no error reporting here
      callback();   // item updated
    });
  }, function(err) {
      if(err)
        console.log(err);
      done();		// all items are done
  });
}
// --------------------------------------------------------------------------------------
// search ldap for radius servers
// --------------------------------------------------------------------------------------
function search_radius_servers(client, data, database, done)
{
  var ret = [];

  async.each(data, function(item, callback) {
    var opts = {
      filter: '(&(eduroamInfRealm=' + item['dn'] + ')(eduroamMonRealm=' + item['dn'] + '))',	// filter by realm dn
      scope: 'sub',
      attributes: [ 'eduroamMonRealm', 'eduroamInfRealm' ]
    };

    client.search(config.search_base_radius, opts, function(err, res) {
      assert.ifError(err);

      res.on('searchEntry', function(entry) {
        var dict = {};
        dict.mon_realms = [];

        if(!entry.object['eduroamMonRealm'] && !entry.object['eduroamInfRealm'])
          item.radius = false;		// is NOT set
        else
          item.radius = true;		// is set
      });

      res.on('error', function(err) {
        console.error('error: ' + err.message);
      });

      res.on('end', function(result) {
        callback();
      });
    });
  }, function(err) {
      if(err)
        console.log(err);
      done();		// all items are done
  });
}
// --------------------------------------------------------------------------------------
// search ldap for organizations
// --------------------------------------------------------------------------------------
function search_orgs(client, data, database, done)
{
  async.eachOf(data, function(item, index, callback) {
    if(item['org_ptr'] != undefined) {		// org pointer is defined
      var opts = {
        scope: 'base',
        attributes: [ 'o;lang-cs' ]
      };

      client.search(item['org_ptr'], opts, function(err, res) {		// use pointer as search base
        assert.ifError(err);

        res.on('searchEntry', function(entry) {
          if(entry.object['o;lang-cs']) {
            data[index]['org_name'] = entry.object['o;lang-cs'];
          }
        });

        res.on('error', function(err) {
          console.error('error: ' + err.message);
        });

        res.on('end', function(result) {
          callback();
        });
      });
    }
    else		// org pointer NOT defined
      callback();
  }, function(err) {
      if(err)
        console.log(err);
      done();		// all items are done
  });
}
// --------------------------------------------------------------------------------------
module.exports = exp;

