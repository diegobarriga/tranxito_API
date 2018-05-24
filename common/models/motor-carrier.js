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
      {where: {motorCarrierId: id, account_status: true, account_type: 'S'}},
       function(err, data) {
         return cb(err, data);
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
      {where: {motorCarrierId: id, account_status: true, account_type: 'D'}},
       function(err, data) {
         return cb(err, data);
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
    MotorCarrier.app.models.Vehicle.find({where: {motorCarrierId: id}})
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
            return cb(null, lastTrackings);
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

  MotorCarrier.driversDutyStats = function(id, span, cb) {
    var driversStats = {};
    var nSpan;
    const TODAY = Date.now();
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
        where: {motorCarrierId: id, account_status: true, account_type: 'D'},
      }).then(async (drivers) => {
        await Promise.all(drivers.map(async (driver) => {
          driversStats[driver.id] = {1: 0, 2: 0, 3: 0, 4: 0};
          await driver.events.find(
            {
              order: 'event_timestamp ASC',
              where: {
                event_type: 1,
                event_timestamp: {gt: TODAY - nSpan},
              },
            })
            .then((events) => {
              events.forEach((event, i) => {
                if (i < events.length - 1) {
                  driversStats[driver.id][event.event_code] +=
                    (events[i + 1].event_timestamp - event.event_timestamp) /
                      (1000 * 60 * 60);
                } else {
                  driversStats[driver.id][event.event_code] +=
                    (TODAY - event.event_timestamp) / (1000 * 60 * 60);
                }
              });
            });
        })).then(() => {
          return cb(null, driversStats);
        });
      });
  };

  MotorCarrier.remoteMethod(
    'driversDutyStats',
    {
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'span', type: 'string', required: true},
      ],
      http: {path: '/:id/driversDutyStats', verb: 'get'},
      returns: {arg: 'data', type: 'string'},
      description: [
        'Get the duty-status aggregated times',
        'for the drivers from the last <span> period',
        'span should be "day", "week" or "month"',
      ],
    });

  MotorCarrier.vehiclesDutyStats = function(id, span, cb) {
    var vehiclesStats = {};
    var nSpan;
    const TODAY = Date.now();
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
    MotorCarrier.app.models.Vehicle.find(
      {
        where: {motorCarrierId: id},
      }).then(async (vehicles) => {
        await Promise.all(vehicles.map(async (vehicle) => {
          vehiclesStats[vehicle.id] = {1: 0, 2: 0, 3: 0, 4: 0};
          await vehicle.events.find(
            {
              order: 'event_timestamp ASC',
              where: {
                event_type: 1,
                event_timestamp: {gt: TODAY - nSpan},
              },
            })
            .then((events) => {
              events.forEach((event, i) => {
                if (i < events.length - 1) {
                  vehiclesStats[vehicle.id][event.event_code] +=
                    (events[i + 1].event_timestamp - event.event_timestamp) /
                      (1000 * 60 * 60);
                } else {
                  vehiclesStats[vehicle.id][event.event_code] +=
                    (TODAY - event.event_timestamp) / (1000 * 60 * 60);
                }
              });
            });
        })).then(() => {
          return cb(null, vehiclesStats);
        });
      });
  };

  MotorCarrier.remoteMethod(
    'vehiclesDutyStats',
    {
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'span', type: 'string', required: 'true'},
      ],
      http: {path: '/:id/vehiclesDutyStats', verb: 'get'},
      returns: {arg: 'data', type: 'string'},
      description: [
        'Get the duty-status aggregated times',
        'for the vehicles from the las <span> period',
        'span should be "day", "week" or "month"',
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
        where: {motorCarrierId: id, account_status: true, account_type: 'D'},
      }).then(async (drivers, err) => {
        if (err) {
          return cb(err);
        }
        await Promise.all(drivers.map(async (driver) => {
          driversAlerts[driver.id] = {speedLimit: 0, timeLimit: 0};
          await driver.trackings.count(
            {
              timestamp: {gt: TODAY - nSpan}, speed_limit_exceeded: true,
            }).then(speedingCount => {
              driversAlerts[driver.id].speedLimit = speedingCount;
            });
          await driver.trackings.count(
            {
              timestamp: {gt: TODAY - nSpan}, drive_time_exceeded: true,
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
    }
  );

  MotorCarrier.nonAuthEvents = function(id, cb) {
    var nonAuthEvents = {};
    MotorCarrier.app.models.Event.find(
      {
        where: {motorCarrierId: id, driverId: null},
      }).then(async (nonAuthEvents, err) => {
        if (err) {
          return cb(err);
        }
        return cb(null, nonAuthEvents);
      });
  };

  MotorCarrier.remoteMethod(
    'nonAuthEvents',
    {
      accepts: [
        {arg: 'id', type: 'string', required: true},
      ],
      http: {path: '/:id/nonAuthEvents', verb: 'get'},
      description: [
        'Get motor carrier events with no authenticated driver',
      ],
    }
  );

  MotorCarrier.dutyStats = function(id, span, cb) {
    /* Get the duty-status aggregated times of the last time <interval> */
    var carrierStats = {1: 0, 2: 0, 3: 0, 4: 0};
    var nSpan;
    const TODAY = Date.now();
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
    MotorCarrier.findById(id).then((motorCarrier, err) => {
      if (err) {
        return cb(err);
      }
      if (!motorCarrier) {
        let err = Error('Motor Carrier not found');
        err.statusCode = '404';
        return cb(err, 'Motor Carrier not found');
      } else {
        motorCarrier.events.find(
          {
            order: 'event_timestamp ASC',
            where: {
              event_type: 1,
              event_timestamp: {gt: TODAY - nSpan},
            },
          })
          .then((events) => {
            events.forEach((event, i) => {
              if (i < events.length - 1) {
                carrierStats[event.event_code] +=
                  (events[i + 1].event_timestamp - event.event_timestamp) /
                    (1000 * 60 * 60);
              } else {
                carrierStats[event.event_code] +=
                  (TODAY - event.event_timestamp) / (1000 * 60 * 60);
              }
            });
            return cb(null, carrierStats);
          });
      }
    });
  };

  MotorCarrier.remoteMethod(
    'dutyStats',
    {
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'span', type: 'string', required: true},
      ],
      http: {path: '/:id/dutyStats', verb: 'get'},
      returns: {arg: 'data', type: 'string'},
      description: [
        'Get the duty-status aggregated times for the motor carrier',
        'from the last <span> period.',
      ],
    });

  MotorCarrier.topDrivers = function(id, span, cb) {
    const TODAY = Date.now();
    var topDrivers = {speedLimit: [], timeLimit: []};
    var speedAlerts = {};
    var timeAlerts = {};
    var top5speed = [0, 0, 0, 0, 0];
    var top5time = [0, 0, 0, 0, 0];
    var candidateDrivers = new Set();
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
        where: {motorCarrierId: id, account_status: true, account_type: 'D'},
      }).then(async (drivers, err) => {
        if (err) {
          return cb(err);
        }
        await Promise.all(drivers.map(async (driver) => {
          speedAlerts[driver.id] = 0;
          timeAlerts[driver.id] = 0;
          await driver.trackings.count(
            {
              timestamp: {gt: TODAY - nSpan}, speed_limit_exceeded: true,
            }).then(speedingCount => {
              speedAlerts[driver.id] = speedingCount;
              if (speedingCount >= top5speed[4]) {
                top5speed[4] = speedingCount;
                top5speed.sort((x, y) => { return y - x; });
                candidateDrivers.add(driver.id);
              }
            });
          await driver.trackings.count(
            {
              timestamp: {gt: TODAY - nSpan}, drive_time_exceeded: true,
            }).then(driveTimeCount => {
              timeAlerts[driver.id] = driveTimeCount;
              if (driveTimeCount >= top5time[4]) {
                top5time[4] = driveTimeCount;
                top5time.sort((x, y) => { return y - x; });
                candidateDrivers.add(driver.id);
              }
            });
        }))
        .then(() => {
          candidateDrivers.forEach((driverId) => {
            if (speedAlerts[driverId] >= top5speed[4]) {
              topDrivers.speedLimit.push(driverId);
            }
            if (timeAlerts[driverId] >= top5time[4]) {
              topDrivers.timeLimit.push(driverId);
            }
          });
          return cb(null, topDrivers);
        });
      });
  };

  MotorCarrier.remoteMethod(
    'topDrivers',
    {
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'span', type: 'string', required: true},
      ],
      http: {path: '/:id/topDrivers', verb: 'get'},
      returns: {arg: 'data', type: 'string'},
      description: [
        'Get the top-5 drivers with most alerts',
        'from the last <span>.',
      ],
    }
  );
};
