'use strict';
var validator = require('validator');
var app = require('../../server/server.js')
var _         = require ('lodash');
var async     = require ('async');
var csv       = require ('fast-csv');
var fork      = require('child_process').fork;
var fs        = require ('fs');
var path      = require ('path');
var loopback  = require ('loopback');



function email_validator(err) {
  if(!validator.isEmail(String(this.email))) return err();
}

function validateDriverLiceseNumber(err) {
  if (this.account_type === 'D' && this.driver_license_number === undefined) err()
}

function validateLicensesIssuingState(err) {
  if (this.account_type === 'D' && this.licenses_issuing_state === undefined) err()
}

function validateAccountStatus(err) {
  if (this.account_type === 'D' && this.account_status === undefined) err()
}

function validateExemptDriverConfiguration(err) {
  if (this.account_type === 'D' && this.exempt_driver_configuration === undefined) err()
  if (this.account_type === 'D' && !['E', '0'].includes(this.exempt_driver_configuration)) err()
}

function validateTimeZoneOffsetUtc(err) {
  if (this.account_type === 'D' && this.time_zone_offset_utc === undefined) err();
  if (this.account_type === 'D' && !Number.isInteger(this.time_zone_offset_utc)) err();
  if (this.account_type === 'D' && (this.time_zone_offset_utc < 4 || this.time_zone_offset_utc > 11)) err();

}

function validateStartingTime24HourPeriod(err) {
  if (this.account_type === 'D' && this.starting_time_24_hour_period === undefined) err()
}

module.exports = function(Person) {

  // validations
  Person.validatesPresenceOf('first_name', 'last_name', 'username', 'account_type', {"message": "Can't be blank"});
  Person.validatesLengthOf('first_name', {min: 2, max: 30});
  Person.validatesLengthOf('last_name', {min: 2, max: 30});
  Person.validatesLengthOf('email', {min: 4, max: 60});
  Person.validate('email', email_validator, {message: 'Must provide a valid email'});
  Person.validatesUniquenessOf('email', {message: 'Email already exists'});
  Person.validatesInclusionOf('account_type', {'in': ['A', 'D', 'S']});
  Person.validate('driver_license_number', validateDriverLiceseNumber, {"message": "Can't be blank when account_type is D"});
  Person.validate('licenses_issuing_state', validateLicensesIssuingState, {"message": "Can't be blank when account_type is D"});
  Person.validate('account_status', validateAccountStatus, {"message": "Can't be blank when account_type is D"});
  Person.validate('exempt_driver_configuration', validateExemptDriverConfiguration, {"message": "Can't be blank when account_type is D"});
  Person.validate('time_zone_offset_utc', validateTimeZoneOffsetUtc, {"message": "Can't be blank when account_type is D"});
  Person.validate('starting_time_24_hour_period', validateStartingTime24HourPeriod, {"message": "Can't be blank when account_type is D"});

  // role assingment
  Person.observe('after save', function (context, next) {    
    var Role = app.models.Role;
    var RoleMapping = app.models.RoleMapping;
    Role.findOne({where: {name: context.instance.account_type}}, function(err, role) { 
        if (context.isNewInstance){
          console.log(context.instance.account_type);
          RoleMapping.create({
              principalType: RoleMapping.USER,
              principalId: context.instance.id,
              roleId: role.id
          });
        };
      next();
    });
  });


  //transactional csv importation
  // based on https://blog.theodo.fr/2016/01/how-to-make-a-user-friendly-and-transactional-csv-import-in-loopback/ tutorial and github repo
  Person.upload = function(req, callback) {
      const Container  = Person.app.models.Container;
      const FileUpload  = Person.app.models.FileUpload;

      // Generate a unique name to the container
      const containerName = `Person-${Math.round(Date.now())}-${Math.round(Math.random() * 1000)}`;

      // async.waterfall is like a waterfall of functions applied one after the other
      return async.waterfall([
        done =>
          // Create the container (the directory where the file will be stored)
          Container.createContainer({name: containerName}, done)
        ,
        function(container, done) {
          req.params.container = containerName;
          // Upload one or more files into the specified container. The request body must use multipart/form-data which the file input type for HTML uses.
          return Container.upload(req, {}, done);
        },
        (fileContainer, done) =>

          // Store the state of the import process in the database
          FileUpload.create({
            date: new Date(),
            fileType: Person.modelName,
            status: 'PENDING'
          }
          , (err, fileUpload) => done(err, fileContainer, fileUpload))
        
      ], function(err, fileContainer, fileUpload) {
        if (err) { return callback(err); }
        const params = {
          fileUpload: fileUpload.id,
          root: Person.app.datasources.container.settings.root,
          container: fileContainer.files.file[0].container,
          file: fileContainer.files.file[0].name
        };

        // Launch a fork node process that will handle the import
        fork(__dirname + '/../../server/scripts/import-people.js', [
          JSON.stringify(params)
        ]);
        return callback(null, fileContainer);
      });
    };


  Person.import = function(container, file, options, callback) {
      // Initialize a context object that will hold the transaction
      const ctx = {};
      console.log('Started import process');

      // The import_preprocess is used to initialize the sql transaction
      return Person.import_preprocess(ctx, container, file, options, err =>
        Person.import_process(ctx, container, file, options, function(importError) {
          if (importError) {
            // rollback does not apply the transaction
            return async.waterfall([
              done => ctx.transaction.rollback(done),
              done =>
                // Do some other stuff to clean and acknowledge the end of the import
                Person.import_postprocess_error(ctx, container, file, options, done)
              ,
              done => Person.import_clean(ctx, container, file, options, done)
            ], () => callback(importError));

          } else {
            return async.waterfall([
              done =>
                // The commit applies the changes to the database
                ctx.transaction.commit(done)
              ,
              done =>
                 // Do some other stuff to clean and acknowledge the end of the import
                Person.import_postprocess_success(ctx, container, file, options, done)
              ,
              done => Person.import_clean(ctx, container, file, options, done)
            ], () => callback(null));
          }
        })
      );
    };


   Person.import_preprocess = (ctx, container, file, options, callback) =>

      // initialize the SQL transaction
      Person.beginTransaction(
        {isolationLevel: Person.Transaction.READ_UNCOMMITTED}
      , function(err, transaction) {
        ctx.transaction = transaction;
        console.log('Transaction begun');
        return callback(err);
      })
    ;



  Person.import_process = function(ctx, container, file, options, callback) {
      const fileContent = [];
      const filename = path.join(Person.app.datasources.container.settings.root, container, file);

      // Here we fix the delimiter of the csv file to semicolon. You can change it or make it a parameter of the import.
      const stream = csv({
        delimiter: ',',
        headers: true
      });
      stream.on('data', data => fileContent.push(data));
      stream.on('end', function() {
        const errors = [];

        // Iterate over every line of the file
        return async.mapSeries(__range__(0, fileContent.length, true), function(i, done) {
          if ((fileContent[i] == null)) { return done(); }

          //  Import the individual line
          return Person.import_handleLine(ctx, fileContent[i], options, function(err) {
            if (err) {
              errors.push(err);
              // If an error is raised on a particular line, store it with the FileUploadError model
              // i + 2 is the real excel user-friendly index of the line
              return Person.app.models.FileUploadError.create({
                line: i + 2,
                message: err.message,
                fileUploadId: options.fileUpload
              }
              , done(null));
            } else {
              return done();
            }
          });
        }
        , function() {
          if (errors.length > 0) { return callback(errors); }
          return callback();
        });
      });
      return fs.createReadStream(filename).pipe(stream);
    };

  function __range__(left, right, inclusive) {
    let range = [];
    let ascending = left < right;
    let end = !inclusive ? right : ascending ? right + 1 : right - 1;
    for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
      range.push(i);
    }
    return range;
  };


    Person.import_postprocess_success = (ctx, container, file, options, callback) =>
      Person.app.models.FileUpload.findById(options.fileUpload, function(err, fileUpload) {
        if (err) { return callback(err); }
        fileUpload.status = 'SUCCESS';
        return fileUpload.save(callback);
      })
    ;

    Person.import_postprocess_error = (ctx, container, file, options, callback) =>
      Person.app.models.FileUpload.findById(options.fileUpload, function(err, fileUpload) {
        if (err) { return callback(err); }
        fileUpload.status = 'ERROR';
        return fileUpload.save(callback);
      })
    ;

    Person.import_clean = (ctx, container, file, options, callback) =>
      Person.app.models.Container.destroyContainer(container, callback)
    ;


    Person.import_handleLine = function(ctx, line, options, callback) {
        line.account_type = 'D'
        line.account_status = true
        line.move_yards_use = (line.move_yards_use == '1') ? true : false
        line.default_use = (line.default_use == '1') ? true : false
        line.personal_use = (line.personal_use == '1') ? true : false
        console.log(line)
        return Person.create(line, callback);
    };

    Person.remoteMethod('upload',
      {
        accepts: {
        arg: 'req',
        type: 'object',
        http: {
          source: 'req'
        }
      },
        http: {
          verb: 'post',
          path: '/upload'
        }
      });


};
