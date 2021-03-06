const ldap = require('ldapjs');
const fs = require('fs');
const async = require('async');
const assert = require('assert');
const secrets = require('../config/secrets.js');
const config = require('../config/config.js');
const ldap2date = require('ldap2date');
const data_export = require('./export.js');
const exec = require('child_process').exec;
// --------------------------------------------------------------------------------------
var exp = {}
// --------------------------------------------------------------------------------------
// process old data
// --------------------------------------------------------------------------------------
exp.synchronize_data = function (database, callback) {
  var client = ldap.createClient({
    url: 'ldaps://' + config.ldap_host
  });

  client.bind(config.bind_dn, secrets.ldap_pass, function(err) {
    assert.ifError(err)
  })

  exp.search_and_update_realms(client, database, config.search_base_realms, callback);
};
// --------------------------------------------------------------------------------------
// search ldap for realms
// --------------------------------------------------------------------------------------
exp.search_and_update_realms = function (client, database, search_base, callback)
{
  // items which are registered for each realm
  var items = [ 'dn', 'cn', 'eduroamConnectionStatus', 'eduroamMemberType', 'manager', 'eduroamTestingId', 'labeledUri', 'oPointer', 'eduroamConnected', 'eduroamRegistered', 'eduroamAppointmentDelivered' ];
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

      if(typeof(entry.object['manager']) === 'object') {	// multiple managers
        for(var manager in entry.object['manager'])
          dict.managers.push(entry.object['manager'][manager].toLowerCase());
      }
      else  // one manager only
        dict.managers.push(entry.object['manager'].toLowerCase());

      dict.testing_id = Boolean(entry.object['eduroamTestingId']);

      if(entry.object['oPointer'])
        dict.org_ptr = entry.object['oPointer'];

      if(entry.object['eduroamConnected'])
        dict.connection_timestamp = ldap2date.parse(entry.object['eduroamConnected']);

      if(entry.object['eduroamRegistered'])
        dict.register_timestamp = ldap2date.parse(entry.object['eduroamRegistered']);

      dict.last_change = new Date();

      if(entry.object['eduroamAppointmentDelivered'])
        dict.appointment = ldap2date.parse(entry.object['eduroamAppointmentDelivered']);

      ret.push(dict);		// prepare results for database update
    });

    res.on('error', function(err) {
      console.error('error: ' + err.message);
      callback();
    });

    res.on('end', function(result) {
      update_coverage_info(ret, function() {
        search_radius_servers(client, ret, database, function() {
          search_orgs(client, ret, database, function() {
            search_managers(client, ret, database, function() {
              update_realms(ret, database, search_base, function() {
                client.unbind(function(err) {   // unbind after all search operations are done
                  assert.ifError(err);
                });

                if(callback)
                  callback();
              });
            });
          });
        });
      });
    });
  });
}
// --------------------------------------------------------------------------------------
// update coverage information
// --------------------------------------------------------------------------------------
function update_coverage_info(data, done)
{
  async.eachOfSeries(data, function(item, key, callback) {
    data[key].coverage_info = false;        // initially set to false

    // get org name from coverage service config
    delete require.cache[require.resolve('/home/eduroamdb/eduroam-db/web/coverage/config/realm_to_inst.js')]
    const inst_mapping = require('/home/eduroamdb/eduroam-db/web/coverage/config/realm_to_inst.js')

    // check if the coverage info file exists
    if(item.realms[0] in inst_mapping && fs.existsSync('/home/eduroamdb/eduroam-db/web/coverage/coverage_files/' + inst_mapping[item.realms[0]] + '.json')) {
      data[key].coverage_info = true;
      callback();
    }

    if(!data[key].coverage_info) {       // no coverage info file exists
      exec("icingacli monitoring list services --format='$service_state$' --service COVERAGE-INFO-" + item.realms[0], function (error, stdout, stderr) {
        data[key].coverage_info = false;

        // if there is output, the service exists
        if(stdout) {
          // output is the state of icinga check as string
          var state = stdout[0];

          if(state == 0)
            data[key].coverage_info = true;
        }
        else {        // no stdout, the service does not exist
          // nothing to do here, data[key].coverage_info still set to false
        }

        callback();
      });
    }
  }, function(err) {
    if(err)
      console.log(err);
    done();
  });
}
// --------------------------------------------------------------------------------------
// update realms collection in database
// --------------------------------------------------------------------------------------
function update_realms(data, database, search_base, done)
{
  async.each(data, function(item, callback) {
    database.realms.aggregate([{ $match : { dn: item.dn } },        // match item by dn
                               { $sort : { last_change : -1 } },    // sort by last_change timestamp
                               { $limit : 1 }                       // get only the newest record
    ],
      function(err, results) {

        if(results.length > 0) {   // something found

          // compare record for insertion and the database record, if they differ, insert record
          if(compare_records(results[0], item, database)) {   // records differ

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

      if(search_base == config.search_base_realms)      // delete non existing realms only when synchronizing data automatically
        delete_nonexistent(database, data, done);
      else
        done();
  });
}
// --------------------------------------------------------------------------------------
// delete non existent realms
// --------------------------------------------------------------------------------------
function delete_nonexistent(database, data, done)
{
  database.realms.distinct("dn",        // distinct data by dn
    function(err, results) {
      async.each(results, function(res, callback) {
        var found = false;

        for(var j in data)
          if(res == data[j].dn)
            found = true;

        if(!found)
          delete_realm(database, res, callback);     // calls callback when finished
        else
          callback();
      }, function(err) {
          if(err)
            console.log(err);
          done();     // all non existent realms deleted
      });
  });
}
// --------------------------------------------------------------------------------------
// delete realm by name
// --------------------------------------------------------------------------------------
function delete_realm(database, name, callback)
{
  database.realms.deleteMany({ dn : name },
    function(err, results) {
      if(err)
        console.log(err);
      callback();
  });
}
// --------------------------------------------------------------------------------------
// compare two records
// --------------------------------------------------------------------------------------
function compare_records(a, b, database)
{
  var items = [ "connection_status", "connection_timestamp", "radius", "register_timestamp", "testing_id", "type", "coverage_info", "org_active", "appointment", "org_name" ]

  // check if connection status changed to connected
  if(a[items[0]] != b[items[0]] && b[items[0]] == "connected")
    data_export.export_data(database);

  for(var i in items) {
    if(a[items[i]] != undefined && b[items[i]] != undefined) {      //  both are defined
      if(a[items[i]].toString() != b[items[i]].toString()) {        // convert to string and the compare - date comparsion issues
        return true;     // records differ
      }
   }
    else {
      if(a[items[i]] == undefined && b[items[i]] == undefined)      //  both are UNdefined
        continue;           // records do not differ so far, continue

      return true;     // records differ
    }
  }

  // check if managers differ
  if(a.managers.length != b.managers.length)
    return true;

  else {
    for(var i in a.managers)
      if(a.managers[i] != b.managers[i])
        return true;
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
          dict.dn = entry.object.dn.toLowerCase();
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
    var entries = [];       // clear entries

    var opts = {
      filter: '(|(eduroamInfRealm=' + item['dn'] + ')(eduroamMonRealm=' + item['dn'] + '))',	// filter by realm dn
      scope: 'sub',
      attributes: [ 'eduroamMonRealm', 'eduroamInfRealm' ]
    };

    client.search(config.search_base_radius, opts, function(err, res) {
      assert.ifError(err);

      res.on('searchEntry', function(entry) {
        entries.push(entry.object);     // add to entries
      });

      res.on('error', function(err) {
        console.error('error: ' + err.message);
      });

      // iterate all results from one search
      // both inf realm and mon realm in any of results must match item.dn
      res.on('end', function(result) {
        var inf_found = false;
        var mon_found = false;

        for(var i in entries) {
          if(entries[i]['eduroamMonRealm']) {
            if(typeof(entries[i]['eduroamMonRealm']) === 'object') {        // array
              for(var j in entries[i]['eduroamMonRealm'])
                if(entries[i]['eduroamMonRealm'][j].toLowerCase() == item.dn.toLowerCase()) // convert to lower case to avoid case sensitive issues
                  mon_found = true;
            }
            else {
              if(entries[i]['eduroamMonRealm'].toLowerCase() == item.dn.toLowerCase())  // convert to lower case to avoid case sensitive issues
                mon_found = true;
            }
          }

          if(entries[i]['eduroamInfRealm']) {
            if(typeof(entries[i]['eduroamInfRealm']) === 'object') {        // array
              for(var j in entries[i]['eduroamInfRealm'])
                if(entries[i]['eduroamInfRealm'][j].toLowerCase() == item.dn.toLowerCase()) // convert to lower case to avoid case sensitive issues
                  inf_found = true;
            }
            else {
              if(entries[i]['eduroamInfRealm'].toLowerCase() == item.dn.toLowerCase())  // convert to lower case to avoid case sensitive issues
                inf_found = true;
            }
          }
        }

        item.radius = (mon_found && inf_found);     // set to true if both mon realm and inf realm were found, false otherwise
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
        attributes: [ 'o;lang-cs', 'cesnetActive', 'ICO', 'cesnetOrgID' ]
      };

      client.search(item['org_ptr'], opts, function(err, res) {		// use pointer as search base
        assert.ifError(err);

        res.on('searchEntry', function(entry) {
          if(entry.object['cesnetOrgID'])
            data[index].org_id = entry.object['cesnetOrgID'];

          if(entry.object['ICO'])
            data[index].org_ico = entry.object['ICO'];

          if(entry.object['o;lang-cs']) {
            data[index]['org_name'] = entry.object['o;lang-cs'];
          }

          if(entry.object['cesnetActive']) {
            if(entry.object['cesnetActive'] == "TRUE")
              data[index]['org_active'] = true;

            else if(entry.object['cesnetActive'] == "FALSE")
              data[index]['org_active'] = false;

            else           // otherwise undefined
              data[index]['org_active'] = undefined;        // this is actually saved as null in the database!
          }
        });

        res.on('error', function(err) {
          console.error('error: ' + err.message);
          callback();
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

