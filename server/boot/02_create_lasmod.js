'use strict';

module.exports = function(app) {
  app.models.LastMod.count({}, function(err, count) {
    if (!count) {
      let now =  Date.now();
      app.models.LastMod.create({
        people: now,
        vehicles: now,
        devices: now,
      });
    }
  });
};
