var fs = require('fs');
// --------------------------------------------------------------------------------------
var exp = {}
// --------------------------------------------------------------------------------------
// export data
// --------------------------------------------------------------------------------------
exp.export_data = function (database) {
  const filename_base = "/home/connection/connection/public/export/export";

  export_json(database, filename_base);
  export_csv(database, filename_base);
};
// --------------------------------------------------------------------------------------
// export data to json
// --------------------------------------------------------------------------------------
function export_json(database, filename_base)
{
  var data = [];
  var stream = database.realms.aggregate([
                             { $match : { connection_status : "connected" } },
                             { $sort : { last_change : 1 } },    // sort by last_change timestamp first !
                             // sorting is needed first for $last to correctly get newest document
                             { $group : { _id : { "dn" : "$dn" },
                             // additional fields
                               connection_status : { $last : "$connection_status" },
                               last_change : { $last : "$last_change" },
                               managers : { $last : "$managers" },
                               realms : { $last : "$realms" },
                               testing_id : { $last : "$testing_id" },
                               register_timestamp : { $last : "$register_timestamp" },
                               connection_timestamp : { $last : "$connection_timestamp" },
                               type : { $last : "$type" },
                               coverage_info : { $last : "$coverage_info" },
                               radius : { $last : "$radius" },
                               org_name : { $last : "$org_name" },
                               org_active : { $last : "$org_active" },
                               org_ico : { $last : "$org_ico" },
                               appointment : { $last : "$appointment" },
                             } },
                             { $project : {
                                _id : 0, org_name : 1, realms : 1, type : 1, connection_timestamp : 1, org_ico : 1
                             } }
                             ])
  .cursor({ batchSize: 1000 }).exec();

  stream.on('error', function (err) {
    console.log(err);
  });

  stream.on('data', function(item) {
    data.push(item);
  });

  stream.on('end', function(items) {
    save_json_data(filename_base, "json", convert_timestamps(data));
  });
}
// --------------------------------------------------------------------------------------
// export data to csv
// --------------------------------------------------------------------------------------
function export_csv(database, filename_base)
{
  var data = [];
  var stream = database.realms.aggregate([
                             { $match : { connection_status : "connected" } },
                             { $sort : { last_change : 1 } },    // sort by last_change timestamp first !
                             // sorting is needed first for $last to correctly get newest document
                             { $group : { _id : { "dn" : "$dn" },
                             // additional fields
                               connection_status : { $last : "$connection_status" },
                               last_change : { $last : "$last_change" },
                               managers : { $last : "$managers" },
                               realms : { $last : "$realms" },
                               testing_id : { $last : "$testing_id" },
                               register_timestamp : { $last : "$register_timestamp" },
                               connection_timestamp : { $last : "$connection_timestamp" },
                               type : { $last : "$type" },
                               coverage_info : { $last : "$coverage_info" },
                               radius : { $last : "$radius" },
                               org_name : { $last : "$org_name" },
                               org_active : { $last : "$org_active" },
                               org_ico : { $last : "$org_ico" },
                               appointment : { $last : "$appointment" },
                             } },
                             { $project : {
                                _id : 0, org_name : 1, realms : 1, type : 1, connection_timestamp : 1, org_ico : 1
                             } }
                             ])
  .cursor({ batchSize: 1000 }).exec();

  stream.on('error', function (err) {
    console.log(err);
  });

  stream.on('data', function(item) {
    data.push(item);
  });

  stream.on('end', function(items) {
    save_csv_data(filename_base, "csv", convert_to_csv(data));
  });
}
// --------------------------------------------------------------------------------------
// save json data into specified file
// --------------------------------------------------------------------------------------
function save_json_data(file, extension, data)
{
  fs.writeFile(file + "." + extension, JSON.stringify(data), 'utf8', function(err) {
    if(err)
      return console.log(err);
  });
}
// --------------------------------------------------------------------------------------
// save csv data into specified file
// --------------------------------------------------------------------------------------
function save_csv_data(file, extension, data)
{
  fs.writeFile(file + "." + extension, data, 'utf8', function(err) {
    if(err)
      return console.log(err);
  });
}
// --------------------------------------------------------------------------------------
// convert timestamps
// --------------------------------------------------------------------------------------
function convert_timestamps(data)
{
  for(var i in data)
    if(data[i].connection_timestamp)
      data[i].connection_timestamp = convert_to_local_date_string(data[i].connection_timestamp);

  return data;
}
// --------------------------------------------------------------------------------------
// convert to csv
// --------------------------------------------------------------------------------------
function convert_to_csv(data)
{
  var items = [ "org_name", "realms", "type", "connection_timestamp", "org_ico", "org_id" ];
  var ret = "";
  ret += "org_name, realms, type, connection_timestamp, org_ico, org_id";
  ret += "\n";

  data = convert_timestamps(data);

  for(var i in data) {
    for(var j in items) {
      if(data[i][items[j]] && typeof(data[i][items[j]]) === 'object' && data[i][items[j]].length > 1) {     // if defined and is array with more than 1 item
        ret += '"';

        for(var k = 0; k < data[i][items[j]].length; k++) {
          if(k != data[i][items[j]].length - 1)
            ret += data[i][items[j]][k] + ", ";
          else
            ret += data[i][items[j]][k];
        }

        ret += '", ';
      }
      else if(data[i][items[j]])     // if defined
        ret += '"' + data[i][items[j]] + '", ';

      else      // not defined
        ret += ", ";
    }
    ret += "\n";
  }

  ret += "\n";
  return ret;
}
// --------------------------------------------------------------------------------------
// convert input to local time and return as string
// --------------------------------------------------------------------------------------
function convert_to_local_date_string(input)
{
  var ret = "";
  var tmp = input.toISOString();
  return tmp.replace(/T.*$/, '').split('-')[2] + ". " + tmp.replace(/T.*$/, '').split('-')[1] + ". " +  tmp.replace(/T.*$/, '').split('-')[0];
}
// --------------------------------------------------------------------------------------
module.exports = exp;

