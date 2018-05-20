'use strict';
var validator = require('validator');
var async = require('async');

function usdotValidator(err) {
  if (!validator.isInt(String(this.USDOT_number), {min: 0, max: 999999999}))
    err();
}

module.exports = function(MotorCarrier) {
  MotorCarrier.validatesPresenceOf(
    'name', 'USDOT_number', 'multiday_basis_used',
    {'message': "Can't be blank"}
  );
  MotorCarrier.validatesLengthOf('name', {min: 4, max: 120});
  MotorCarrier.validatesNumericalityOf(
    'USDOT_number', 'multiday_basis_used', {int: true}
  );
  MotorCarrier.validatesInclusionOf('multiday_basis_used', {in: [7, 8]});
  MotorCarrier.validate(
    'USDOT_number', usdotValidator,
     {message: 'USDOT number not in range 0 - 999,999,999'}
   );

  MotorCarrier.getSupervisors = function(id, cb) {
    MotorCarrier.app.models.Person.find(
      {where: {MotorCarrierId: id, account_status: true, account_type: 'S'}},
       function(err, data) {
         cb(err, data);
       });
  };

  MotorCarrier.remoteMethod(
    'getSupervisors',
    {
      accepts: {arg: 'id', type: 'string'},
      http: {path: '/:id/supervisors', verb: 'get'},
      returns: {arg: 'data', type: 'string', root: true},
      description: [
        'Get all non archived supervisors',
        "(account_type: 'S', account_status: true)",
        'from the MotorCarrier with the required id',
      ],
    });

  MotorCarrier.getDrivers = function(id, cb) {
    MotorCarrier.app.models.Person.find(
      {where: {MotorCarrierId: id, account_status: true, account_type: 'D'}},
       function(err, data) {
         cb(err, data);
       });
  };

  MotorCarrier.remoteMethod(
    'getDrivers',
    {
      accepts: {arg: 'id', type: 'string'},
      http: {path: '/:id/drivers', verb: 'get'},
      returns: {arg: 'data', type: 'string', root: true},
      description: [
        'Get all non archived drivers',
        "(account_type: 'D', account_status: true)",
        'from the MotorCarrier with the required id',
      ],
    });

  MotorCarrier.lastTracking = function(id, cb) {
    var lastTrackings = {};
    MotorCarrier.app.models.Vehicle.find({where: {MotorCarrierId: id}})
        .then(async function(vehicles) {
          await Promise.all(vehicles.map(async (vehicle) => {
            await vehicle.trackings.findOne(
              {order: 'timestamp DESC'})
              .then(function(tracking) {
                lastTrackings[vehicle.id] = tracking;
              });
            await vehicle.events.findOne(
              {where: {
                'event_type': 1,
                vehicleId: vehicle.id,
              },
                order: 'event_timestamp DESC'}
            ).then((event) => {
              if (event)
                lastTrackings[vehicle.id].eventCode = event.event_code;
            });
          }))
          .then(() => {
            cb(null, lastTrackings);
          });
        });
  };

  MotorCarrier.remoteMethod(
    'lastTracking',
    {
      accepts: {arg: 'id', type: 'string'},
      http: {path: '/:id/tracking', verb: 'get'},
      returns: {arg: 'data', type: 'string'},
      description: [
        'Get the last tracking information of the motor carriers vehicles',
      ],
    });

  MotorCarrier.driverAlerts = function(id, span, cb) {
    const TODAY = Date.now();
    var driversAlerts = {};
    var nSpan;
    switch (span) {
      case 'day':
        nSpan = 24 * 60 * 60 * 1000;
        break;
      case 'week':
        nSpan = 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        nSpan = 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        let err = Error('Unrecognized span');
        err.statusCode = 400;
        return cb(err, 'Unrecognized span');
        break;
    }
    MotorCarrier.app.models.Person.find(
      {
        where: {MotorCarrierId: id, account_status: true, account_type: 'D'},
      }).then(async (drivers, err) => {
        if (err) {
          return cb(err);
        }
        await Promise.all(drivers.map(async (driver) => {
          driversAlerts[driver.id] = {speedLimit: 0, timeLimit: 0};
          await driver.trackings.count(
            {
              timestamp: {gt: TODAY - nSpan}, speed_limit_exceeded: true
            }).then(speedingCount => {
              driversAlerts[driver.id].speedLimit = speedingCount;
            });
          await driver.trackings.count(
            {
              timestamp: {gt: TODAY - nSpan}, drive_time_exceeded: true
            }).then(driveTimeCount => {
              driversAlerts[driver.id].timeLimit = driveTimeCount;
            });
        }))
        .then(() => {
          return cb(null, driversAlerts);
        });
      });
  };

  MotorCarrier.remoteMethod(
    'driverAlerts',
    {
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'span', type: 'string', required: true},
      ],
      http: {path: '/:id/driverAlerts', verb: 'get'},
      returns: {arg: 'data', type: 'string'},
      description: [
        'Get the number of alerts by type for the motor carriers drivers',
        'from the last <span> period.',
        'span should be "day", "week" or "month"',
      ],
    });
};
