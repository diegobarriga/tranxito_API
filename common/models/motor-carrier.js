'use strict';
var validator = require('validator');
var async = require('async');
var LoopBackContext = require('loopback-context');
var path = require('path');
var csv = require('fast-csv');
var fs = require('fs');

function nameValidator(err) {
  if (this.name && this.name.trim() === '')
    err();
}

function usdotValidator(err) {
  if (!validator.isInt(String(this.usdotNumber), {min: 0, max: 999999999}))
    err();
}

module.exports = function(MotorCarrier) {
  MotorCarrier.validatesUniquenessOf('name', {message: 'Name already exists'});
  MotorCarrier.validatesUniquenessOf('usdotNumber',
   {message: 'USDOT number already exists'});
  MotorCarrier.validatesPresenceOf(
    'name', 'usdotNumber', 'multidayBasisUsed',
    {'message': "Can't be blank"}
  );
  MotorCarrier.validatesLengthOf('name', {min: 4, max: 120});
  MotorCarrier.validatesNumericalityOf(
    'usdotNumber', 'multidayBasisUsed', {int: true}
  );
  MotorCarrier.validatesInclusionOf('multidayBasisUsed', {in: [7, 8]});
  MotorCarrier.validate(
    'usdotNumber', usdotValidator,
     {message: 'USDOT number not in range 0 - 999,999,999'}
   );
  MotorCarrier.validate(
    'name', nameValidator,
     {message: "Name can't be blank"}
   );

  MotorCarrier.getSupervisors = function(id, cb) {
    MotorCarrier.app.models.Person.find(
      {where: {motorCarrierId: id, accountStatus: true, accountType: 'S'}},
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
        "(accountType: 'S', accountStatus: true)",
        'from the MotorCarrier with the required id',
      ],
    });

  MotorCarrier.getDrivers = function(id, cb) {
    MotorCarrier.app.models.Person.find(
      {where: {motorCarrierId: id, accountStatus: true, accountType: 'D'}},
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
        "(accountType: 'D', accountStatus: true)",
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
                'type': 1,
                vehicleId: vehicle.id,
              },
                order: 'timestamp DESC'}
            ).then((event) => {
              if (event)
                lastTrackings[vehicle.id].eventCode = event.code;
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
        where: {motorCarrierId: id, accountStatus: true, accountType: 'D'},
      }).then(async (drivers) => {
        await Promise.all(drivers.map(async (driver) => {
          driversStats[driver.id] = {1: 0, 2: 0, 3: 0, 4: 0};
          await driver.events.find(
            {
              order: 'timestamp ASC',
              where: {
                type: 1,
                timestamp: {gt: TODAY - nSpan},
              },
            })
            .then((events) => {
              events.forEach((event, i) => {
                if (i < events.length - 1) {
                  driversStats[driver.id][event.code] +=
                    (events[i + 1].timestamp - event.timestamp) /
                      (1000 * 60 * 60);
                } else {
                  driversStats[driver.id][event.code] +=
                    (TODAY - event.timestamp) / (1000 * 60 * 60);
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
              order: 'timestamp ASC',
              where: {
                type: 1,
                timestamp: {gt: TODAY - nSpan},
              },
            })
            .then((events) => {
              events.forEach((event, i) => {
                if (i < events.length - 1) {
                  vehiclesStats[vehicle.id][event.code] +=
                    (events[i + 1].timestamp - event.timestamp) /
                      (1000 * 60 * 60);
                } else {
                  vehiclesStats[vehicle.id][event.code] +=
                    (TODAY - event.timestamp) / (1000 * 60 * 60);
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
        where: {motorCarrierId: id, accountStatus: true, accountType: 'D'},
      }).then(async (drivers, err) => {
        if (err) {
          return cb(err);
        }
        await Promise.all(drivers.map(async (driver) => {
          driversAlerts[driver.id] = {speedLimit: 0, timeLimit: 0};
          await driver.trackings.count(
            {
              timestamp: {gt: TODAY - nSpan}, speedLimitExceeded: true,
            }).then(speedingCount => {
              driversAlerts[driver.id].speedLimit = speedingCount;
            }).catch(err => { throw err; });
          await driver.trackings.count(
            {
              timestamp: {gt: TODAY - nSpan}, driveTimeExceeded: true,
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
    MotorCarrier.app.models.Event.find(
      {where: {motorCarrierId: id, driverId: null}},
       function(err, data) {
         if (err) {
           return cb(err);
         }
         data = data.filter(event => event.driverId === null);
         return cb(err, data);
       });
  };

  MotorCarrier.remoteMethod(
    'nonAuthEvents',
    {
      accepts: {arg: 'id', type: 'string', required: true},
      returns: {arg: 'data', type: '[object]', root: true},
      http: {path: '/:id/nonAuthEvents', verb: 'get'},
      returns: {arg: 'data', type: 'string', root: true},

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
        where: {motorCarrierId: id, accountStatus: true, accountType: 'D'},
      }).then(async (drivers) => {
        await Promise.all(drivers.map(async (driver) => {
          await driver.events.find(
            {
              order: 'timestamp ASC',
              where: {
                type: 1,
                timestamp: {gt: TODAY - nSpan},
              },
            })
            .then((events) => {
              events.forEach((event, i) => {
                if (i < events.length - 1) {
                  carrierStats[event.code] +=
                    (events[i + 1].timestamp - event.timestamp) /
                      (1000 * 60 * 60);
                } else {
                  carrierStats[event.code] +=
                    (TODAY - event.timestamp) / (1000 * 60 * 60);
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
        where: {motorCarrierId: id, accountStatus: true, accountType: 'D'},
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
              timestamp: {gt: TODAY - nSpan}, speedLimitExceeded: true,
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
              timestamp: {gt: TODAY - nSpan}, driveTimeExceeded: true,
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
        'and get the top-5 drivers with most alerts',
        'both from the last <span>.',
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

  MotorCarrier.devicesCsvUpload = function(id, req, callback) {
    return this.csvUpload(req, 'Device', callback);
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
        FileUpload.create({
          date: new Date(),
          fileType: MotorCarrier.modelName,
          status: 'PENDING',
          personId: req.currentUser.id,
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
        currentUser: req.currentUser,
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

  MotorCarrier.import =
  function(container, file, options, modelName, callback) {
    // Initialize a context object that will hold the transaction
    const ctx = {};
    console.log('Started import process');

    // The importPreprocess is used to initialize the sql transaction
    MotorCarrier.importPreprocess(
      ctx, container, file, options, function(err, transaction) {
        MotorCarrier.importProcess(
          ctx, container, file, options, modelName, function(importError) {
            if (importError) {
              async.waterfall([
                done => ctx.transaction.rollback(done),
                done => MotorCarrier.importPostprocessError(
                  ctx, container, file, options, done),
              ], () => callback(importError));
            } else {
              async.waterfall([
                done => ctx.transaction.commit(done),
                done => MotorCarrier.importPostprocessSuccess(
                  ctx, container, file, options, done),
              ], () => callback(null));
            }
          });
      });
  };

  MotorCarrier.importPreprocess =
  function(ctx, container, file, options, callback) {
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

  MotorCarrier.importProcess =
  function(ctx, container, file, options, modelName, callback) {
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

      data.motorCarrierId = options.currentUser && options.currentUser.motorCarrierId;

      if (modelName === 'Person') {
        data.accountType = 'D';
        data.accountStatus = true;
        data.moveYardsUse = (data.moveYardsUse == '1');
        data.defaultUse = (data.defaultUse == '1');
        data.personalUse = (data.personalUse == '1');
      }

      if (modelName === 'Device') {
        data.state = true;
        data.configScript = "#string"
        data.configStatus = false;
        data.sequenceId = 0
        data.vehicleId = undefined;
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
        if (index > dataList.length - 1) {
          if (errors.length > 0) {
            return callback(errors[0]);
          } else {
            return callback(null);
          }
        }

        let model;
        if (modelName === 'Person') {
          model = MotorCarrier.app.models.Person;
        }
        if (modelName === 'Vehicle') {
          model = MotorCarrier.app.models.Vehicle;
        }
        if (modelName === 'Device') {
          model = MotorCarrier.app.models.Device;
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

  MotorCarrier.importPostprocessSuccess =
  (ctx, container, file, options, callback) =>
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

  MotorCarrier.importPostprocessError =
  (ctx, container, file, options, callback) =>
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
        'Create multiple vehicles through a csv',
      ],
    });

  MotorCarrier.remoteMethod(
    'devicesCsvUpload',
    {
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'req', type: 'object', http: {source: 'req'}, required: true},
      ],
      http: {verb: 'post', path: '/:id/devices/csvUpload'},
      returns: [
        {arg: 'message', type: 'string', root: true},
      ],
      description: [
        'Create multiple devices through a csv',
      ],
    });
};
