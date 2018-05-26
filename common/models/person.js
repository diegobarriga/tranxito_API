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
      } else if (person.account_type !== 'D') {
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
              event_type: 1,
              event_timestamp: {gt: DATE_LIMIT},
            },
          }, function(erro, data) {
          if (erro) return cb(erro);
          person.events.findOne(
            {
              order: 'event_timestamp DESC',
              where: {
                event_type: 1,
                event_timestamp: {lt: DATE_LIMIT},
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

  // Certify all the uncertified events for a driver
  Person.certifyEvents = function(req, id, cb) {
    Person.findById(id, function(err, person) {
      if (!person) {
        err = Error('Person not found');
        err.statusCode = '404';
        cb(err, 'Person not found');
      } else if (person.account_type != 'D') {
        err = Error('Person found but not a driver.');
        err.statusCode = '422';
        cb(err, 'Person is not a driver');
      } else {
        person.events.find(
          {
            where: {
              certified: false,
            },
          }, function(error, events) {
          if (error) {
            return cb(error);
          }
          events.forEach(function(event) {
            event.certified = true;
            event.date_of_certified_record = Date.now();
            event.save();
          });
          cb(null); // revisar que respuesta se debe enviar
        });
      }
    });
  };

  Person.remoteMethod(
    'certifyEvents',
    {
      accepts: [
        {arg: 'req', type: 'object', required: true},
        {arg: 'id', type: 'string', required: true},
      ],
      http: {path: '/:id/certifyEvents', verb: 'patch'},
      returns: {arg: 'message', type: 'string'},
      description: [
        'Certify all the uncertified events for a driver',
      ],
    });
};
