'use strict';
var validator = require('validator');
var app = require('../../server/server.js');
var _         = require('lodash');
var async     = require('async');
var csv       = require('fast-csv');
var fs        = require('fs');
var path      = require('path');
var loopback  = require('loopback');
var LoopBackContext = require('loopback-context');

function emailValidator(err) {
  if (!validator.isEmail(String(this.email))) return err();
}

function validateDriverLiceseNumber(err) {
  if (this.account_type === 'D' && this.driver_license_number === undefined)
    err();
}

function validateLicensesIssuingState(err) {
  if (this.account_type === 'D' && this.licenses_issuing_state === undefined)
    err();
}

function validateAccountStatus(err) {
  if (this.account_type === 'D' && this.account_status === undefined) err();
}

function validateExemptDriverConfiguration(err) {
  if ((this.account_type === 'D' &&
    this.exempt_driver_configuration === undefined) ||
   (this.account_type === 'D' &&
    !['E', '0'].includes(this.exempt_driver_configuration)))
    err();
}

function validateTimeZoneOffsetUtc(err) {
  if ((this.account_type === 'D' && this.time_zone_offset_utc === undefined) ||
  (this.account_type === 'D' && !Number.isInteger(this.time_zone_offset_utc)) ||
  (this.account_type === 'D' &&
   (this.time_zone_offset_utc < 4 || this.time_zone_offset_utc > 11)))
    err();
}

function validateStartingTime24HourPeriod(err) {
  if (this.account_type === 'D' &&
   this.starting_time_24_hour_period === undefined)
    err();
}

module.exports = function(Person) {
  // validations
  Person.validatesPresenceOf(
    'first_name', 'last_name', 'username', 'account_type',
    {'message': "Can't be blank"}
  );
  Person.validatesLengthOf('first_name', {min: 2, max: 30});
  Person.validatesLengthOf('last_name', {min: 2, max: 30});
  Person.validatesLengthOf('email', {min: 4, max: 60});
  Person.validate(
    'email', emailValidator, {message: 'Must provide a valid email'}
  );
  Person.validatesUniquenessOf('email', {message: 'Email already exists'});
  Person.validatesInclusionOf('account_type', {'in': ['A', 'D', 'S']});
  Person.validate('driver_license_number', validateDriverLiceseNumber,
    {'message': "Can't be blank when account_type is D"});
  Person.validate('licenses_issuing_state', validateLicensesIssuingState,
    {'message': "Can't be blank when account_type is D"});
  Person.validate('account_status', validateAccountStatus,
    {'message': "Can't be blank when account_type is D"});
  Person.validate(
    'exempt_driver_configuration', validateExemptDriverConfiguration,
    {'message': "Can't be blank when account_type is D"});
  Person.validate('time_zone_offset_utc', validateTimeZoneOffsetUtc,
    {'message': "Can't be blank when account_type is D"});
  Person.validate(
    'starting_time_24_hour_period', validateStartingTime24HourPeriod,
    {'message': "Can't be blank when account_type is D"});

  // role assingment
  Person.observe('after save', function(context, next) {
    var Role = app.models.Role;
    var RoleMapping = app.models.RoleMapping;
    Role.findOne({
      where: {name: context.instance.account_type},
    }, function(err, role) {
      if (context.isNewInstance) {
        RoleMapping.create({
          principalType: RoleMapping.USER,
          principalId: context.instance.id,
          roleId: role.id,
        });
      };
      next();
    });
  });

  Person.upload = function(req, callback) {
    const Container  = Person.app.models.Container;
    const FileUpload  = Person.app.models.FileUpload;

    // Generate a unique name to the container
    const containerName =
    `Person-${Math.round(Date.now())}-${Math.round(Math.random() * 1000)}`;

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
          fileType: Person.modelName,
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
        root: Person.app.datasources.container.settings.root,
        container: fileContainer.files.file[0].container,
        file: fileContainer.files.file[0].name,
      };

      // Launch a fork node process that will handle the import
      // fork(__dirname + '/../../server/scripts/import-people.js', [
      //   JSON.stringify(params)
      // ]);
      Person.import(
        params.container, params.file, params, err => console.log(
          err ? 'Error with csv import' : 'Import process ended correctly'));

      return callback(null, fileContainer);
    });
  };

  Person.import = function(container, file, options, callback) {
    // Initialize a context object that will hold the transaction
    const ctx = {};
    console.log('Started import process');

    // The import_preprocess is used to initialize the sql transaction
    Person.import_preprocess(
      ctx, container, file, options, function(err, transaction) {
        Person.import_process(
          ctx, container, file, options, function(importError) {
            if (importError) {
              async.waterfall([
                done => ctx.transaction.rollback(done),
                done => Person.import_postprocess_error(
                  ctx, container, file, options, done),
              ], () => callback(importError));
            } else {
              async.waterfall([
                done => ctx.transaction.commit(done),
                done => Person.import_postprocess_success(
                  ctx, container, file, options, done),
              ], () => callback(null));
            }
          });
      });
  };

  Person.import_preprocess = function(ctx, container, file, options, callback) {
    // initialize the SQL transaction
    Person.beginTransaction(
      {isolationLevel: Person.Transaction.READ_UNCOMMITTED}
    , function(err, transaction) {
      ctx.transaction = transaction;
      console.log('Transaction begun');
      callback(err, transaction);
    });
  };

  Person.import_process = function(ctx, container, file, options, callback) {
    const errors = [];
    let i = -1;
    const filename = path.join(
      Person.app.datasources.container.settings.root, container, file);
    const stream = csv({
      delimiter: ',',
      headers: true,
      ignoreEmpty: true,
      objectMode: true,
    });
    stream.on('data', data => {
      stream.pause();
      i++;
      console.log(data);
      var context = LoopBackContext.getCurrentContext();
      var currentUser = context && context.get('currentUser');
      data.motorCarrierId = currentUser.motorCarrierId;
      data.account_type = 'D';
      data.account_status = true;
      data.move_yards_use = (data.move_yards_use == '1') ? true : false;
      data.default_use = (data.default_use == '1') ? true : false;
      data.personal_use = (data.personal_use == '1') ? true : false;
      Person.create(data, function(err) {
        if (err) {
          errors.push(err);
          Person.app.models.FileUploadError.create({
            line: i + 2,
            message: err.message,
            fileUploadId: options.fileUpload,
          }, function(err2) {
            if (err2) {
              console.log('Error creating FileUploadError');
            }
          });
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

  Person.import_postprocess_success = (
    ctx, container, file, options, callback) =>
    Person.app.models.FileUpload.findById(
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
        Person.app.models.Container.destroyContainer(container, callback);
      });

  Person.import_postprocess_error = (ctx, container, file, options, callback) =>
    Person.app.models.FileUpload.findById(
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
        Person.app.models.Container.destroyContainer(container, callback);
      });

  Person.import_handleLine = function(ctx, line, options, callback) {
    var context = LoopBackContext.getCurrentContext();
    var currentUser = context && context.get('currentUser');
    line.motorCarrierId = currentUser.motorCarrierId;
    line.account_type = 'D';
    line.account_status = true;
    line.move_yards_use = (line.move_yards_use == '1') ? true : false;
    line.default_use = (line.default_use == '1') ? true : false;
    line.personal_use = (line.personal_use == '1') ? true : false;
    return Person.create(line, callback);
  };

  Person.rejectLine =
    function(columnName, cellData, customErrorMessage, callback) {
      const err = new Error(
        `Unprocessable entity in column ${columnName}\
         where data = ${cellData}: ${customErrorMessage}`
       );
      err.status = 422;
      return callback(err);
    };

  Person.remoteMethod(
    'upload',
    {
      accepts: {arg: 'req', type: 'object',
        http: {source: 'req'},
      },
      http: {verb: 'post', path: '/upload'},
    });

  Person.setImage = function(id, image, cb) {
    Person.findById(id, function(err, person) {
      if (err) {
        return cb(err);
      }
      if (!person) {
        err = Error('Person not found');
        err.statusCode = '404';
        cb(err, 'Person not found');
      } else {
        person.image = image;
        person.save();
        cb(null, 'Image set correctly');
      }
    });
  };

  Person.remoteMethod('setImage', {
    accepts: [
      {arg: 'id', type: 'number', required: true},
      {arg: 'image', type: 'string', required: true},
    ],
    returns: {arg: 'message', type: 'string'},
    http: {path: '/:id/setImage', verb: 'post'},
  });

  Person.softDelete = function(id, cb) {
    Person.findById(id, function(err, person) {
      if (err) {
        return cb(err);
      }
      if (!person) {
        err = Error('Person not found');
        err.statusCode = '404';
        cb(err, 'Person not found');
      } else {
        person.account_status = false;
        person.save(function(err, person) {
          cb(err, person);
        });
      }
    });
  };

  Person.remoteMethod('softDelete', {
    accepts: {arg: 'id', type: 'number', required: true},
    returns: {arg: 'message', type: 'string', root: true},
    http: {path: '/:id/', verb: 'delete'},
    description: ['Soft delete of a model instance'],
  });
};
