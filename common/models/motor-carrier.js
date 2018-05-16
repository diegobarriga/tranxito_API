'use strict';
var validator = require('validator');
var async = require('async');

function usdotValidator(err) {
  if (!validator.isInt(String(this.USDOT_number), {min: 0, max: 999999999}))
    err();
}

module.exports = function(Motorcarrier) {
  Motorcarrier.validatesPresenceOf(
    'name', 'USDOT_number', 'multiday_basis_used',
    {'message': "Can't be blank"}
  );
  Motorcarrier.validatesLengthOf('name', {min: 4, max: 120});
  Motorcarrier.validatesNumericalityOf(
    'USDOT_number', 'multiday_basis_used', {int: true}
  );
  Motorcarrier.validatesInclusionOf('multiday_basis_used', {in: [7, 8]});
  Motorcarrier.validate(
    'USDOT_number', usdotValidator,
     {message: 'USDOT number not in range 0 - 999,999,999'}
   );

  Motorcarrier.getSupervisors = function(id, cb) {
    Motorcarrier.app.models.Person.find(
      {where: {motorCarrierId: id, account_status: true, account_type: 'S'}},
       function(err, data) {
         cb(err, data);
       });
  };

  Motorcarrier.remoteMethod(
    'getSupervisors',
    {
      accepts: {arg: 'id', type: 'string'},
      http: {path: '/:id/supervisors', verb: 'get'},
      returns: {arg: 'data', type: 'string', root: true},
      description: [
        'Get all non archived supervisors',
        "(account_type: 'S', account_status: true)",
        'from the Motorcarrier with the required id',
      ],
    });

  Motorcarrier.getDrivers = function(id, cb) {
    Motorcarrier.app.models.Person.find(
      {where: {motorCarrierId: id, account_status: true, account_type: 'D'}},
       function(err, data) {
         cb(err, data);
       });
  };

  Motorcarrier.remoteMethod(
    'getDrivers',
    {
      accepts: {arg: 'id', type: 'string'},
      http: {path: '/:id/drivers', verb: 'get'},
      returns: {arg: 'data', type: 'string', root: true},
      description: [
        'Get all non archived drivers',
        "(account_type: 'D', account_status: true)",
        'from the Motorcarrier with the required id',
      ],
    });

  Motorcarrier.lastTracking = function(id, cb) {
    var lastTrackings = {};
    Motorcarrier.app.models.Vehicle.find({where: {motorCarrierId: id}})
        .then(async function(vehicles) {
          await Promise.all(vehicles.map(async (vehicle) => {
            await vehicle.trackings.findOne(
              {order: 'timestamp DESC'})
              .then(function(tracking) {
                lastTrackings[vehicle.id] = tracking;
              });
            await vehicle.events.findOne(
              {where: {or: [
                {'event_code': 1},
                {'event_code': 2},
                {'event_code': 3},
                {'event_code': 4},
              ], vehicleId: vehicle.id},
                order: 'event_timestamp DESC'}
            ).then((event) => {
              lastTrackings[vehicle.id].eventCode = event.event_code;
            });
          }))
          .then(() => {
            cb(null, lastTrackings);
          });
        });
  };

  Motorcarrier.remoteMethod(
    'lastTracking',
    {
      accepts: {arg: 'id', type: 'string'},
      http: {path: '/:id/tracking', verb: 'get'},
      returns: {arg: 'data', type: 'string'},
      description: [
        'Get the last tracking information of the motor carriers vehicles',
      ],
    });
};
