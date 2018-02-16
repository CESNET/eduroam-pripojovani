module.exports = function(database) {
// --------------------------------------------------------------------------------------
  const CronJob = require('cron').CronJob;
  const ldap_sync = require('./cron/ldap_sync.js');
// --------------------------------------------------------------------------------------
  // run once a day
// --------------------------------------------------------------------------------------
  //ldap_sync.synchronize_data(database);
  new CronJob('0 00 05 * * *', function() {     // run at 05:00:00
    ldap_sync.synchronize_data(database);
  }, null, true, 'Europe/Prague');
}
// --------------------------------------------------------------------------------------
