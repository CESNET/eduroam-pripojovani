module.exports = function(database) {
// --------------------------------------------------------------------------------------
  const CronJob = require('cron').CronJob;
  const ldap_sync = require('./cron/ldap_sync.js');
  const exp = require('./cron/export.js');
// --------------------------------------------------------------------------------------
  // run once a day
// --------------------------------------------------------------------------------------
  new CronJob('0 00 05 * * *', function() {     // run at 05:00:00
    ldap_sync.synchronize_data(database,
      function() {      // export data after sync is done
        exp.export_data(database);
    });
  }, null, true, 'Europe/Prague');
}
// --------------------------------------------------------------------------------------
