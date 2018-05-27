'use strict';
var validator = require('validator');
var async = require('async');
var LoopBackContext = require('loopback-context');
var path = require('path');
var csv = require('fast-csv');
var fs = require('fs');

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
              }).catch(err => { throw err; });
            await vehicle.events.findOne(
              {where: {
                'event_type': 1,
                vehicleId: vehicle.id,
              },
                order: 'event_timestamp DESC'}
            ).then((event) => {
              if (event)
                lastTrackings[vehicle.id].eventCode = event.event_code;
            }).catch(err => { throw err; });
          }))
          .then(() => {
            return cb(null, lastTrackings);
          }).catch(err => { throw err; });
        }).catch(err => { throw err; });
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
    const TODAY = Date.now();
    var driversStats = {};
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
            }).catch(err => { throw err; });
        })).then(() => {
          return cb(null, driversStats);
        }).catch(err => { throw err; });
      }).catch(err => { throw err; });
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
            }).catch(err => { throw err; });
        })).then(() => {
          return cb(null, vehiclesStats);
        }).catch(err => { throw err; });
      }).catch(err => { throw err; });
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
/*
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
            }).catch(err => { throw err; });
          await driver.trackings.count(
            {
              timestamp: {gt: TODAY - nSpan}, drive_time_exceeded: true,
            }).then(driveTimeCount => {
              driversAlerts[driver.id].timeLimit = driveTimeCount;
            });
        }))
        .then(() => {
          return cb(null, driversAlerts);
        }).catch(err => { throw err; });
      }).catch(err => { throw err; });
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
*/

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
      }).catch(err => { throw err; });
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
    /* Get the duty-status aggregated times of the last time <span> */
    const TODAY = Date.now();
    var carrierStats = {1: 0, 2: 0, 3: 0, 4: 0};
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
      }).then(async (drivers) => {
        await Promise.all(drivers.map(async (driver) => {
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
                  carrierStats[event.event_code] +=
                    (events[i + 1].event_timestamp - event.event_timestamp) /
                      (1000 * 60 * 60);
                } else {
                  carrierStats[event.event_code] +=
                    (TODAY - event.event_timestamp) / (1000 * 60 * 60);
                }
              });
            }).catch(err => { throw err; });
        })).then(() => {
          return cb(null, carrierStats);
        }).catch(err => { throw err; });
      }).catch(err => { throw err; });
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

  MotorCarrier.driverAlerts = function(id, span, cb) {
    const TODAY = Date.now();
    var driversAlerts = {};
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
          driversAlerts[driver.id] = {speedLimit: 0, timeLimit: 0};
          speedAlerts[driver.id] = 0;
          timeAlerts[driver.id] = 0;
          await driver.trackings.count(
            {
              timestamp: {gt: TODAY - nSpan}, speed_limit_exceeded: true,
            }).then(speedingCount => {
              speedAlerts[driver.id] = speedingCount;
              driversAlerts[driver.id].speedLimit = speedingCount;
              if (speedingCount >= top5speed[4]) {
                top5speed[4] = speedingCount;
                top5speed.sort((x, y) => { return y - x; });
                candidateDrivers.add(driver.id);
              }
            }).catch(err => { throw err; });
          await driver.trackings.count(
            {
              timestamp: {gt: TODAY - nSpan}, drive_time_exceeded: true,
            }).then(driveTimeCount => {
              timeAlerts[driver.id] = driveTimeCount;
              driversAlerts[driver.id].timeLimit = driveTimeCount;
              if (driveTimeCount >= top5time[4]) {
                top5time[4] = driveTimeCount;
                top5time.sort((x, y) => { return y - x; });
                candidateDrivers.add(driver.id);
              }
            }).catch(err => { throw err; });
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
          return cb(
            null, {'topDrivers': topDrivers, 'driversAlerts': driversAlerts}
          );
        }).catch(err => { throw err; });
      }).catch(err => { throw err; });
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

  MotorCarrier.createContainerName = function(modelName) {
    return `${modelName}-${Math.round(Date.now())}-
      ${Math.round(Math.random() * 1000)}`;
  };

  MotorCarrier.peopleCsvUpload = function(id, req, callback) {
    return this.csvUpload(req, 'Person', callback);
  };

  MotorCarrier.vehiclesCsvUpload = function(id, req, callback) {
    return this.csvUpload(req, 'Vehicle', callback);
  };

  MotorCarrier.csvUpload = function(req, modelName, callback) {
    const Container  = MotorCarrier.app.models.Container;
    const FileUpload  = MotorCarrier.app.models.FileUpload;

    // Generate a unique name to the container
    const containerName = this.createContainerName(modelName);

    // async.waterfall is like a waterfall of functions applied one after the other
    return async.waterfall([
      function(done) {
        // Create the container (the directory where the file will be stored)
        Container.createContainer({name: containerName}, done);
      },
      function(container, done) {
        req.params.container = containerName;
        // Upload one or more files into the specified container. The request body must use multipart/form-data which the file input type for HTML uses.
        Container.upload(req, {}, done);
      },
      function(fileContainer, done) {
        // Store the state of the import process in the database
        var context = LoopBackContext.getCurrentContext();
        var currentUser = context && context.get('currentUser');
        FileUpload.create({
          date: new Date(),
          fileType: MotorCarrier.modelName,
          status: 'PENDING',
          personId: currentUser.id,
        }, function(err, fileUpload) {
          done(err, fileContainer, fileUpload);
        });
      },
    ], function(err, fileContainer, fileUpload) {
      if (err) { return callback(err); }
      const params = {
        fileUpload: fileUpload.id,
        root: MotorCarrier.app.datasources.container.settings.root,
        container: fileContainer.files.file[0].container,
        file: fileContainer.files.file[0].name,
      };

      MotorCarrier.import(
        params.container, params.file, params, modelName, err => console.log(
          err ? 'Error with csv import' : 'Import process ended correctly'));

      return callback(null, {
        'fileUploadId': fileUpload.id,
        'message': 'make a get request to' +
         `/api/file-uploads/${fileUpload.id} to access the status`,
      });
    });
  };

  MotorCarrier.import = function(container, file, options, modelName, callback) {
    // Initialize a context object that will hold the transaction
    const ctx = {};
    console.log('Started import process');

    // The import_preprocess is used to initialize the sql transaction
    MotorCarrier.import_preprocess(
      ctx, container, file, options, function(err, transaction) {
        MotorCarrier.import_process(
          ctx, container, file, options, modelName, function(importError) {
            if (importError) {
              async.waterfall([
                done => ctx.transaction.rollback(done),
                done => MotorCarrier.import_postprocess_error(
                  ctx, container, file, options, done),
              ], () => callback(importError));
            } else {
              async.waterfall([
                done => ctx.transaction.commit(done),
                done => MotorCarrier.import_postprocess_success(
                  ctx, container, file, options, done),
              ], () => callback(null));
            }
          });
      });
  };

  MotorCarrier.import_preprocess = function(ctx, container, file, options, callback) {
    // initialize the SQL transaction
    MotorCarrier.beginTransaction(
      {isolationLevel: MotorCarrier.Transaction.READ_COMMITTED},
      function(err, transaction) {
        ctx.transaction = transaction;
        console.log('Transaction begun');
        callback(err, transaction);
      }
    );
  };

  MotorCarrier.import_process = function(ctx, container, file, options, modelName, callback) {
    let errors = [];
    let i = -1;
    const filename = path.join(
      MotorCarrier.app.datasources.container.settings.root, container, file);
    const stream = csv({
      delimiter: ',',
      headers: true,
      ignoreEmpty: true,
      objectMode: true,
      discardUnmappedColumns: true,
    });
    let dataList = [];
    stream.on('data', data => {
      stream.pause();
      i++;
      console.log(data);
      var context = LoopBackContext.getCurrentContext();
      var currentUser = context && context.get('currentUser');
      if (currentUser) {
        data.motorCarrierId = currentUser.motorCarrierId;
      }

      if (modelName === 'Person') {
        data.account_type = 'D';
        data.account_status = true;
        data.move_yards_use = (data.move_yards_use == '1') ? true : false;
        data.default_use = (data.default_use == '1') ? true : false;
        data.personal_use = (data.personal_use == '1') ? true : false;
      }

      data.line = i + 2;
      dataList.push(data);
      stream.resume();
    });

    stream.on('end', function() {
      if (dataList.length === 0) {
        return callback(null);
      }

      let transactionOptions = {transaction: ctx.transaction};
      function recursiveTransactionCreateInstance(index) {
        console.log(`recursiveTransactionCreateInstance: ${index} `);
        if (index > dataList.length - 1) {
          console.log(`dataList.length reached ${index} - ${errors}`);
          if (errors.length > 0) {
            return callback(errors[0]);
          } else {
            return callback(null);
          }
        }

        let model;
        if (modelName === 'Person') {
          model = MotorCarrier.app.models.Person;
        } else {
          model = MotorCarrier.app.models.Vehicle;
        }
        model.create(dataList[index], transactionOptions, function(err) {
          if (err) {
            errors.push(err);
            MotorCarrier.app.models.FileUploadError.create({
              line: dataList[index].line,
              message: err.message,
              fileUploadId: options.fileUpload,
            }, function(err2) {
              if (err2) {
                console.log('Error creating FileUploadError');
              }
            });
          }
          return recursiveTransactionCreateInstance(index + 1);
        });
      }

      return recursiveTransactionCreateInstance(0);
    });
    return fs.createReadStream(filename).pipe(stream);
  };

  MotorCarrier.import_postprocess_success = (ctx, container, file, options, callback) =>
    MotorCarrier.app.models.FileUpload.findById(
      options.fileUpload, function(err, fileUpload) {
        if (err) { return callback(err); }
        fileUpload.status = 'SUCCESS';
        console.log('Success');
        fileUpload.save(function(err) {
          if (err) {
            return callback(err);
          }
        });
        console.log('Container Deleted');
        MotorCarrier.app.models.Container.destroyContainer(container, callback);
      });

  MotorCarrier.import_postprocess_error = (ctx, container, file, options, callback) =>
    MotorCarrier.app.models.FileUpload.findById(
      options.fileUpload, function(err, fileUpload) {
        if (err) { return callback(err); }
        fileUpload.status = 'ERROR';
        console.log('Error');
        fileUpload.save(function(err) {
          if (err) {
            return callback(err);
          }
        });
        console.log('Container Deleted');
        MotorCarrier.app.models.Container.destroyContainer(container, callback);
      });

  MotorCarrier.remoteMethod(
    'peopleCsvUpload',
    {
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'req', type: 'object', http: {source: 'req'}, required: true},
      ],
      // http: {verb: 'post', path: '/people/csvUpload'},
      http: {verb: 'post', path: '/:id/people/csvUpload'},
      returns: [
        {arg: 'message', type: 'string', root: true},
      ],
      description: [
        'Create múltiple people through a csv',
      ],
    });

  MotorCarrier.remoteMethod(
    'vehiclesCsvUpload',
    {
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'req', type: 'object', http: {source: 'req'}, required: true},
      ],
      http: {verb: 'post', path: '/:id/vehicles/csvUpload'},
      returns: [
        {arg: 'message', type: 'string', root: true},
      ],
      description: [
        'Create múltiple vehicles through a csv',
      ],
    });
};
