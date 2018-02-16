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

  search_realms(client, database);
};
// --------------------------------------------------------------------------------------
// search ldap for realms
// --------------------------------------------------------------------------------------
function search_realms(client, database)
{
  // items which are registered for each realm
  var items = [ 'dn', 'cn', 'eduroamConnectionStatus', 'eduroamMemberType', 'manager', 'eduroamTestingId', 'labeledUri', 'oPointer', 'eduroamConnected', 'eduroamRegistered' ];
  var ret = [];

  var opts = {
    filter: '(objectclass=eduroamRealm)',
    scope: 'sub',
    attributes: items
  };

  client.search(config.search_base_realms, opts, function(err, res) {
    assert.ifError(err);

    res.on('searchEntry', function(entry) {
      // debug
      //console.log(entry.object);

      var dict = {};
      dict.managers = [];
      dict.realms = [];

      if(typeof(entry.object['cn']) === 'object') {	// multiple realms
	dict.realms = entry.object['cn']
      }
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

      // TODO
      if(entry.object['oPointer'])
	dict.org_ptr = entry.object['oPointer'];

      // TODO
      if(entry.object['eduroamConnected'])
	dict.connection_timestamp = ldap2date.parse(entry.object['eduroamConnected']);

      // TODO
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
	//console.log(ret);
        search_orgs(client, ret, database, function(data) {
	  // debug
	  //console.log("======================");
	  //console.log(data);

	  search_managers(client, data, database);
	  update_realms(data, database);
	});
      });
    });
  });
}
// --------------------------------------------------------------------------------------
// update realms collection in database
// --------------------------------------------------------------------------------------
function update_realms(data, database)
{
  for(var i in data) {
    database.realms.update({ dn : data[i].dn }, data[i], { upsert : true },
    function(err, result) {
      if(err)
        console.error(err);
    });
  }
}
// --------------------------------------------------------------------------------------
// search ldap for managers
// --------------------------------------------------------------------------------------
function search_managers(client, data, database)
{
  var ret = [];

  for(var item in data) {
    for(var manager in data[item]['managers']) {
      var opts = {
	scope: 'sub',
	attributes: [ 'uid', 'cn' ]
      };

      client.search(data[item]['managers'][manager], opts, function(err, res) {
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
          update_managers(ret, database);
        });
      });
    }
  }
}
// --------------------------------------------------------------------------------------
// update managers collection in database
// --------------------------------------------------------------------------------------
function update_managers(data, database)
{
  for(var i in data) {
    database.managers.update({ dn: data[i].dn }, data[i], { upsert : true },
    function(err, result) {
      // no error reporting here
    });
  }
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

    //console.log(item['org_ptr']);
    //console.log(item['org_ptr'] != undefined);

    // TODO ?
    if(item['org_ptr'] != undefined) {		// org pointer is defined

      var opts = {
	//filter: "dn=" + item['org_ptr'],	// filter by item name pointer
	scope: 'base',
	attributes: [ 'o;lang-cs' ]
      };

      client.search(item['org_ptr'], opts, function(err, res) {		// use pointer as search base
	assert.ifError(err);

	res.on('searchEntry', function(entry) {
	  // debug
	  //console.log("found something");

	  // TODO
	  if(entry.object['o;lang-cs']) {
	    data[index]['org_name'] = entry.object['o;lang-cs'];

	    // debug
	    //console.log(item['org_ptr']);
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
      //console.log(data);

      if(err)
        console.log(err);
      done(data);		// all items are done
  });
}
// --------------------------------------------------------------------------------------
module.exports = exp;

