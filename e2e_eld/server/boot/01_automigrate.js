// Script used to automatically create tables based on models.
// This will re-create the tables, thus erasing any data.

module.exports = function(app) {

  app.dataSources.postgresDB.automigrate();
  app.dataSources.mongoDB.automigrate();

}
