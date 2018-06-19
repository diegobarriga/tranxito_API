'use strict';
var validator = require('validator');
var app = require('../../server/server.js');
var _         = require('lodash');
var loopback  = require('loopback');
var LoopBackContext = require('loopback-context');

function emailValidator(err) {
  if (!validator.isEmail(String(this.email))) return err();
}

function validateDriverLiceseNumber(err) {
  if (this.accountType.trim() === 'D' &&
    (this.driverLicenseNumber === undefined ||
    this.driverLicenseNumber.trim() === ''))
    return err();
}

function validateLicensesIssuingState(err) {
  if (this.accountType.trim() === 'D' &&
  (this.licenseIssuingState === undefined ||
    this.licenseIssuingState.trim() === ''))
    return err();
}

function validateAccountStatus(err) {
  if (this.accountType.trim() === 'D' &&
    this.accountStatus === undefined)
    return err();
}

function validateExemptDriverConfiguration(err) {
  if ((this.accountType.trim() === 'D' &&
    (this.exemptDriverConfiguration === undefined ||
      this.exemptDriverConfiguration.trim() === '')) ||
   (this.accountType === 'D' &&
    !['E', '0'].includes(this.exemptDriverConfiguration.trim())))
    return err();
}

function validateTimeZoneOffsetUtc(err) {
  if ((this.accountType.trim() === 'D' &&
    this.timeZoneOffsetUtc === undefined) ||
  (this.accountType.trim() === 'D' &&
    !Number.isInteger(this.timeZoneOffsetUtc)) ||
  (this.accountType.trim() === 'D' &&
   (this.timeZoneOffsetUtc < 4 || this.timeZoneOffsetUtc > 11)))
    err();
}

function validateStartingTime24HourPeriod(err) {
  if (this.accountType.trim() === 'D' &&
   this.startingTime24HourPeriod === undefined)
    return err();
}

function firstNameValidator(err) {
  if (this.firstName && this.firstName.trim() === '') return err();
}

function lastNameValidator(err) {
  if (this.lastName && this.lastName.trim() === '') return err();
}

module.exports = function(Person) {
  // validations
  Person.validatesPresenceOf(
    'firstName', 'lastName', 'username', 'accountType',
    {'message': "Can't be blank"}
  );

  // Blank content
  Person.validate('firstName', firstNameValidator,
  {message: "First Name can't be blank"});
  Person.validate('lastName', lastNameValidator,
  {message: "Last Name can't be blank"});

  // Other
  Person.validatesLengthOf('firstName', {min: 2, max: 30});
  Person.validatesLengthOf('lastName', {min: 2, max: 30});
  Person.validatesLengthOf('email', {min: 4, max: 60});
  Person.validate(
    'email', emailValidator, {message: 'Must provide a valid email'}
  );
  Person.validatesInclusionOf('accountType', {'in': ['A', 'D', 'S']});
  Person.validate('driverLicenseNumber', validateDriverLiceseNumber,
    {'message': "Can't be blank when accountType is D"});
  Person.validate('licenseIssuingState', validateLicensesIssuingState,
    {'message': "Can't be blank when accountType is D"});
  Person.validate('accountStatus', validateAccountStatus,
    {'message': "Can't be blank when accountType is D"});
  Person.validate(
    'exemptDriverConfiguration', validateExemptDriverConfiguration,
    {'message': "Can't be blank when accountType is D"});
  Person.validate('timeZoneOffsetUtc', validateTimeZoneOffsetUtc,
    {'message': "Can't be blank when accountType is D"});
  Person.validate(
    'startingTime24HourPeriod', validateStartingTime24HourPeriod,
    {'message': "Can't be blank when accountType is D"});

  // role assingment
  Person.observe('after save', function(context, next) {
    var Role = app.models.Role;
    var RoleMapping = app.models.RoleMapping;
    Role.findOne({
      where: {name: context.instance.accountType},
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

  Person.observe('after save', function(context, next) {
    app.models.LastMod.findOne({}, function(err, LastMod) {
      if (err) throw (err);
      var NOW = Date.now();
      var currentContext = LoopBackContext.getCurrentContext();
      LastMod.people = NOW;
      if (currentContext) currentContext.set('timestamp', NOW);
      LastMod.save(function(error) {
        if (error) throw (error);
        next();
      });
    });
  });

  Person.afterRemote('**', function(ctx, modelInstance, next) {
    var currentContext = LoopBackContext.getCurrentContext();
    app.models.LastMod.findOne({}, function(err, LastMod) {
      ctx.res.set('LastMod', LastMod.people);
      next();
    });
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
        person.accountStatus = false;
        person.save(function(err, person) {
          cb(err, person);
        });
      }
    });
  };

  Person.remoteMethod(
    'softDelete',
    {
      accepts: {arg: 'id', type: 'number', required: true},
      returns: {arg: 'message', type: 'string', root: true},
      http: {path: '/:id/', verb: 'delete'},
      description: ['Soft delete of a model instance'],
    });

  Person.dutyStatusChange = function(id, cb) {
    Person.findById(id, function(err, person) {
      if (err) {
        return cb(err);
      }
      if (!person) {
        err = Error('Person not found');
        err.statusCode = '404';
        cb(err, 'Person not found');
      } else if (person.accountType !== 'D') {
        console.log(person);
        err = Error('Person found but not a driver.');
        err.statusCode = '422';
        cb(err, 'Person is not a driver');
      } else {
        const ONE_DAY = 24 * 60 * 60 * 1000;
        const DATE_LIMIT = Date.now() - ONE_DAY;
        person.events.find(
          {
            where: {
              type: 1,
              timestamp: {gt: DATE_LIMIT},
            },
          }, function(erro, data) {
          if (erro) return cb(erro);
          person.events.findOne(
            {
              order: 'timestamp DESC',
              where: {
                type: 1,
                timestamp: {lt: DATE_LIMIT},
              },
            }, function(error, first) {
            if (error) return cb(error);
            cb(null, [first ? first : {}, data]);
          });
        });
      }
    });
  };

  Person.remoteMethod(
    'dutyStatusChange',
    {
      accepts: {arg: 'id', type: 'string', required: true},
      http: {path: '/:id/dutyStatusChange', verb: 'get'},
      returns: {arg: 'data', type: 'string'},
      description: [
        'Get the events associated to duty-status change',
        'for the specified driver from the last 24 hour',
      ],
    });
};
