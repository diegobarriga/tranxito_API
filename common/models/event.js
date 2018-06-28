'use strict';
var validator = require('validator');
var loopback  = require('loopback');
var LoopBackContext = require('loopback-context');

function typeValidator(err) {
  if (!validator.isInt(String(this.type), {min: 1, max: 7})) return err();
}

function codeValidator(err) {
  let eventTypes = [1, 2, 3, 4, 5, 6, 7];
  let dict = {
    1: {
      min: 1,
      max: 4,
    },
    2: {
      min: 1,
      max: 2,
    },
    3: {
      min: 0,
      max: 2,
    },
    4: {
      min: 1,
      max: 9,
    },
    5: {
      min: 1,
      max: 2,
    },
    6: {
      min: 1,
      max: 4,
    },
    7: {
      min: 1,
      max: 4,
    },
  };
  if (!this.type ||
    !eventTypes.includes(this.type) ||
    !validator.isInt(String(this.code),
     {min: dict[this.type].min, max: dict[this.type].max}))
    return err();
}

function recordStatusValidator(err) {
  if (!validator.isInt(String(this.recordStatus), {min: 1, max: 4}))
    return err();
}

function recordOriginValidator(err) {
  if (!validator.isInt(String(this.recordOrigin), {min: 1, max: 4}))
    return err();
}

function accumulatedVehicleMilesValidator(err) {
  if (
    !validator.isInt(
      String(this.accumulatedVehicleMiles), {min: 0, max: 9999})
  ) return err();
}

function elapsedEngineHoursValidator(err) {
  if (!validator.isFloat(
    String(this.elapsedEngineHours), {min: 0.0, max: 99.9}) ||
   !validator.isInt(String((this.elapsedEngineHours * 10) % 1))
 ) return err();
}

function distanceSinceLastValidCoordinatesValidator(err) {
  if (!validator.isInt(
    String(this.distSinceLastValidCoords), {min: 0, max: 6})
  ) return err();
}

function annotationValidator1(err) {
  if (
    (this.annotation && this.annotation.trim().length < 4) ||
     (this.annotation && this.annotation.trim().length > 60)
   ) return err();
}

function annotationValidator2(err) {
  // If the event was edited, there must be an annotation for the updated one
  if ((this.referenceId || this.recordOrigin == 2 || this.recordStatus == 2) &&
  !this.annotation) return err();
}

function dataCheckValueValidator(err) {
  if (!validator.isInt(
    String(this.dataCheckValue), {min: 0, max: 255})
  ) return err();
}

function totalVehicleMilesValidator(err) {
  if (!validator.isInt(
    String(this.totalVehicleMiles), {min: 0, max: (9999999)}) ||
    this.totalVehicleMiles < this.accumulatedVehicleMiles
  ) return err();
}

function totalEngineHoursValidator(err) {
  if (
    !validator.isFloat(
      String(this.totalEngineHours), {min: 0.0, max: 99999.9}) ||
   !validator.isInt(String((this.totalEngineHours * 10) % 1)) ||
   this.totalEngineHours < this.elapsedEngineHours
 ) return err();
}

function timeZoneOffsetUtcValidator(err) {
  if (
    !validator.isInt(
      String(this.timeZoneOffsetUtc), {min: 4, max: 11})
    ) return err();
}

function diagnosticCodeValidator(err) {
  let valArray = ['P', 'E', 'T', 'L', 'R', 'S',
    'O', '1', '2', '3', '4', '5', '6'];
  if (this.diagnosticCode && !valArray.includes(this.diagnosticCode.trim()))
    return err();
}

function shippingDocNumberValidator(err) {
  if (this.shippingDocNumberValidator &&
    (this.shippingDocNumberValidator.trim().length == 0 ||
    this.shippingDocNumberValidator.trim().length > 40))
    return err();
}

function driverLocationDescriptionValidator(err) {
  if (this.driverLocationDescription &&
  (this.driverLocationDescription.trim().length < 5 ||
  this.driverLocationDescription.trim().length > 60))
    return err();
}

function dateOfCertifiedRecordValidator(err) {
  if (this.certified && !this.dateOfCertifiedRecord) return err();
}

function certifiedValidator(err) {
  if (this.dateOfCertifiedRecord && !this.certified) return err();
}

module.exports = function(Event) {
  Event.validatesPresenceOf(
    'type',
    'recordStatus',
    'recordOrigin',
    'timestamp',
    'code',
    'dataCheckValue',
    'shippingDocNumber',
    {'message': "Can't be blank"}
  );
  Event.validatesNumericalityOf(
    'recordStatus',
    'recordOrigin',
    'type',
    'code',
    'accumulatedVehicleMiles',
    'distSinceLastValidCoords',
    'dataCheckValue',
    'totalVehicleMiles',
    'timeZoneOffsetUtc',
     {int: true}
   );

  Event.validate('type', typeValidator,
  {message: 'Event type must be between 1-7'});
  Event.validate('code', codeValidator,
  {message: 'Invalid event code value for given event type'});
  Event.validate('recordStatus', recordStatusValidator,
  {message: 'Event record status must be between 1-4'});
  Event.validate('recordOrigin', recordOriginValidator,
  {message: 'Event record origin must be between 1-4'});
  Event.validate('accumulatedVehicleMiles', accumulatedVehicleMilesValidator);
  Event.validate('elapsedEngineHours', elapsedEngineHoursValidator);
  Event.validate('distSinceLastValidCoords',
  distanceSinceLastValidCoordinatesValidator, {message:
    'Event distSinceLastValidCoordinates value must be between 0-6'});
  Event.validate('annotation', annotationValidator1,
  {message: 'Annotation lenght must be between 4-60 char long'});
  Event.validate('annotation', annotationValidator2,
  {message: 'Driver event edits must be accompanied by an annotation'});
  Event.validate('dataCheckValue', dataCheckValueValidator,
  {message: 'Event dataCheckValue must be between 0-255'});
  Event.validate('totalVehicleMiles', totalVehicleMilesValidator);
  Event.validate('dateOfCertifiedRecord', dateOfCertifiedRecordValidator,
  {message: "Missing event's date of certification"});
  Event.validate('certified', certifiedValidator,
  {message: 'Event needs to be certified'});
  Event.validate('totalEngineHours', totalEngineHoursValidator);
  Event.validate('timeZoneOffsetUtcValidator', timeZoneOffsetUtcValidator,
  {message: 'Event timezone offset in UTC must be between 4-11'});
  Event.validate('shippingDocNumber', shippingDocNumberValidator,
  {message: "Event shipping doc number can't be blank"});
  Event.validate('driverLocationDescription',
  driverLocationDescriptionValidator,
  {message: "Event driver's location description can't be blank"});
  Event.validate('shippingDocNumber',
  shippingDocNumberValidator,
  {message: "shippingDocNumber can't be blank"});

  Event.softPatch = function(id, data, cb) {
    Event.findById(id, function(err, originalEvent) {
      if (err) {
        return cb(err);
      }
      if (!originalEvent) {
        err = Error('Event not found');
        err.statusCode = '404';
        cb(err, 'Event not found');
      } else if (!data.annotation || data.annotation.trim() == '') {
        err = Error('Driver edits must be accompanied by an annotation');
        err.statusCode = '400';
        cb(err, 'Driver edits must be accompanied by an annotation');
      } else {
        // Duplicate data
        let duplicatedData = Object.assign({}, originalEvent.__data);
        delete duplicatedData.id;
        // Create Referece with original event and update data
        duplicatedData.referenceId = originalEvent.__data.id;
        duplicatedData.recordOrigin = 2;
        // if event was certified it looses its certification
        duplicatedData.certified = false;
        duplicatedData.dateOfCertifiedRecord = null;
        // Set original event to updated status
        originalEvent.updateAttribute('recordStatus', 2,
         function(err, _) {
           if (err) throw err;
         });
        // Create a new duplicated instance from original event
        Event.create(duplicatedData, function(err, instance) {
          if (err) cb(err);
          instance.updateAttributes(data, function(err, _) {
            if (err) throw err;
          });
          cb(null, instance);
        });
      }
    });
  };

  Event.remoteMethod('softPatch', {
    accepts: [
      {arg: 'id', type: 'number', required: true},
      {arg: 'data', type: 'object', required: true},
    ],
    returns: {arg: 'event', type: 'object', root: true},
    http: {path: '/:id/', verb: 'patch'},
    description: ['Soft patch attributes for a model instance and persist it ' +
   'into the data source.'],
  });

  Event.observe('after save', function updateSequenceId(ctx, next) {
    if (ctx.instance) {
      ctx.instance.updateAttribute('sequenceId', ctx.instance.id % 65536,
      function(err, _) {
        if (err) throw err;
      });
    } else {
      ctx.data.sequenceId = ctx.data.id % 65536;
    }
    next();
  });
};
