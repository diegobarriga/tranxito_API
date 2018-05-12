'use strict';
var validator = require('validator');
var app = require('../../server/server.js');
var _         = require('lodash');
var async     = require('async');
var csv       = require('fast-csv');
var fork      = require('child_process').fork;
var fs        = require('fs');
var path      = require('path');
var loopback  = require('loopback');
var LoopBackContext = require('loopback-context');

function vinValidator(err) {
  if (this.vin != '' && (this.vin.length > 18 || this.vin.length < 17))
    return err();
}

function CMV_power_unit_numberValidator(err) {
  if (this.IMEI_ELD && !this.CMV_power_unit_number) return err();
}

module.exports = function(Vehicle) {
  // Vehicle.validate('vin', vinValidator);
  Vehicle.validatesNumericalityOf('IMEI_ELD', {int: true});
  Vehicle.validatesLengthOf('CMV_power_unit_number', {min: 1, max: 10});
  Vehicle.validate('CMV_power_unit_number', CMV_power_unit_numberValidator,
    {'message': "Can't be blank if connected to ELD"});
  Vehicle.setImage = function(id, image, cb) {
    Vehicle.findById(id, function(err, vehicle) {
      if (err) {
        cb(err, 'Vehicle not found');
      } else {
        vehicle.image = image;
        vehicle.save();
        cb(null, 'Image set correctly');
      }
    });
  };

  Vehicle.remoteMethod('setImage', {
    accepts: [
      {arg: 'id', type: 'number', required: true},
      {arg: 'image', type: 'string', required: true},
    ],
    returns: {arg: 'message', type: 'string'},
    http: {path: '/:id/setImage', verb: 'post'},
  });

  Vehicle.upload = function(req, callback) {
    const Container  = Vehicle.app.models.Container;
    const FileUpload  = Vehicle.app.models.FileUpload;

    // Generate a unique name to the container
    const containerName = `Vehicle-${Math.round(Date.now())}-${Math.round(Math.random() * 1000)}`;

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
          fileType: Vehicle.modelName,
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
        root: Vehicle.app.datasources.container.settings.root,
        container: fileContainer.files.file[0].container,
        file: fileContainer.files.file[0].name,
      };
      // Launch a fork node process that will handle the import
      // fork(__dirname + '/../../server/scripts/import-people.js', [
      //   JSON.stringify(params)
      // ]);
      Vehicle.import(params.container, params.file, params, err => console.log(err ? 'Error with csv import' : 'Import process ended correctly'));

      return callback(null, fileContainer);
    });
  };

  Vehicle.import = function(container, file, options, callback) {
    // Initialize a context object that will hold the transaction
    const ctx = {};
    console.log('Started import process');

    // The import_preprocess is used to initialize the sql transaction
    Vehicle.import_preprocess(ctx, container, file, options, function(err, transaction) {
      Vehicle.import_process(ctx, container, file, options, function(importError) {
        if (importError) {
          async.waterfall([
            done => ctx.transaction.rollback(done),
            done => Vehicle.import_postprocess_error(ctx, container, file, options, done),
          ], () => callback(importError));
        } else {
          async.waterfall([
            done => ctx.transaction.commit(done),
            done => Vehicle.import_postprocess_success(ctx, container, file, options, done),
          ], () => callback(null));
        }
      });
    });
  };

  Vehicle.import_preprocess = function(ctx, container, file, options, callback) {
    // initialize the SQL transaction
    Vehicle.beginTransaction(
      {isolationLevel: Vehicle.Transaction.READ_UNCOMMITTED}
    , function(err, transaction) {
      ctx.transaction = transaction;
      console.log('Transaction begun');
      callback(err, transaction);
    })
  };

  Vehicle.import_process = function(ctx, container, file, options, callback) {
    const errors = [];
    let i = -1;
    const filename = path.join(Vehicle.app.datasources.container.settings.root, container, file);
    const stream = csv({
      delimiter: ',',
      headers: true,
      ignoreEmpty: true,
      objectMode: true
    });
    stream.on('data', data => {
      i++;
      stream.pause();
      console.log(data);
      var context = LoopBackContext.getCurrentContext();
      var currentUser = context && context.get('currentUser');
      data.motorCarrierId = currentUser.motorCarrierId;
      Vehicle.create(data, function(err) {
        if (err) {
          errors.push(err);
          Vehicle.app.models.FileUploadError.create({
            line: i + 2,
            message: err.message,
            fileUploadId: options.fileUpload,
          }, function(err2) {
            if (err2) {
              console.log('Error creating FileUploadError');
            }
          }
          );
        }
        stream.resume();
      });
    });
    stream.on('end', function() {
      if (errors) {
        callback(errors[0]);
      } else {
        callback(null);
      }
    });
    return fs.createReadStream(filename).pipe(stream);
  };

  Vehicle.import_postprocess_success = (ctx, container, file, options, callback) =>
    Vehicle.app.models.FileUpload.findById(options.fileUpload, function(err, fileUpload) {
      if (err) { return callback(err); }
      fileUpload.status = 'SUCCESS';
      console.log('Success');
      fileUpload.save(function(err) {
        if (err) {
          return callback(err);
        }
      });
      console.log('Container Deleted');
      Vehicle.app.models.Container.destroyContainer(container, callback);
    })
  ;

  Vehicle.import_postprocess_error = (ctx, container, file, options, callback) =>
    Vehicle.app.models.FileUpload.findById(options.fileUpload, function(err, fileUpload) {
      if (err) { return callback(err); }
      fileUpload.status = 'ERROR';
      console.log('Error');
      fileUpload.save(function(err) {
        if (err) {
          return callback(err);
        }
      });
      console.log('Container Deleted');
      Vehicle.app.models.Container.destroyContainer(container, callback);
    })
  ;

  Vehicle.remoteMethod('upload', {
    accepts: {
      arg: 'req',
      type: 'object',
      http: {
        source: 'req',
      },
    },
    http: {
      verb: 'post',
      path: '/upload',
    },
  });
};
