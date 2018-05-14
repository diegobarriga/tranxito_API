'use strict';
// Script used to automatically create tables based on models.
// This will re-create the tables, thus erasing any data.

module.exports = function(app) {
  // app.dataSources.postgresDB.automigrate();
  var psql = app.dataSources.postgresDB;
  var lbtables = [
    'User', 'AccessToken', 'ACL', 'RoleMapping', 'Role', 'Person',
    'MotorCarrier', 'Vehicle', 'Event', 'FileUpload', 'FileUploadError',
    'Tracking', 'Device',
  ];
  lbtables.forEach(function(model) {
    console.log('Cheking if table for model ' +
    model + ' is created and up-to-date in DB...');
    psql.isActual(model, function(err, actual) {
      if (actual) {
        console.log('Model ' + model + ' is created and up-to-date in DB...');
      } else {
        console.log('Difference found! Auto-migrating model ' +
         model + '...');
        psql.automigrate(model, function() {
          console.log('Auto-migrated model ' + model + ' successfully.');
        });
      }
    });
  });
};
