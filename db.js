const mongoose = require('mongoose');
exports.mongoose = mongoose;
// --------------------------------------------------------------------------------------
// realm collection
// --------------------------------------------------------------------------------------
var realms_schema = mongoose.Schema({
  dn : String,
  managers : Array,
  realms : Array,
  type : String,
  testing_id : Boolean,
  register_timestamp : Date,
  connection_timestamp : Date,
  connection_status : String,
  radius : Boolean,
  xml_url : Boolean,
  last_change : Date,
  appointment : Date,
  org_name : String,
  org_active : Boolean,
  org_ico : String,
  org_id : String
},
{ versionKey: false });
// --------------------------------------------------------------------------------------
exports.realms_schema = realms_schema;
var realms = mongoose.model('realms', realms_schema, 'realms');
exports.realms = realms;
// --------------------------------------------------------------------------------------
// managers collection
// --------------------------------------------------------------------------------------
var managers_schema = mongoose.Schema({
  name : String,
  dn : String,
},
{ versionKey: false });
// --------------------------------------------------------------------------------------
exports.managers_schema = managers_schema;
var managers = mongoose.model('managers', managers_schema, 'managers');
exports.managers = managers;
// --------------------------------------------------------------------------------------
mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
// --------------------------------------------------------------------------------------
// connect to the databse
// --------------------------------------------------------------------------------------
exports.connect = function()
{
  mongoose.connect('mongodb://localhost/connection', {
    db: { native_parser: true },
    server : {
      poolSize: 20,
      socketOptions : {
        socketTimeoutMS: 0,
        connectTimeoutMS: 5000,
        keepAlive: 300000
      }
    }
  });
}
// --------------------------------------------------------------------------------------
// disconnect from the databse
// --------------------------------------------------------------------------------------
exports.disconnect = function()
{
  mongoose.connection.close();
}
// --------------------------------------------------------------------------------------
