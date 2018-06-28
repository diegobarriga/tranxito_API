'use strict';
var validator = require('validator');
var loopback  = require('loopback');
var LoopBackContext = require('loopback-context');

function eventTypeValidator(err) {
  if (!validator.isInt(String(this.type), {min: 1, max: 7})) return err();
}

function eventCodeValidator(err) {
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

function eventRecordStatusValidator(err) {
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

function annotationValidator(err) {
  if (
    (this.annotation && this.annotation.length < 4) ||
     (this.annotation && this.annotation.length > 60)
   ) return err();
}

function eventDataCheckValueValidator(err) {
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
    this.shippingDocNumberValidator.trim() === '')
    return err();
}

function driverLocationDescriptionValidator(err) {
  if (this.driverLocationDescription &&
  this.driverLocationDescription.trim() === '')
    return err();
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

  Event.validate('type', eventTypeValidator);
  Event.validate('code', eventCodeValidator);
  Event.validate('recordStatus', eventRecordStatusValidator);
  Event.validate('recordOrigin', recordOriginValidator);
  Event.validate('accumulatedVehicleMiles', accumulatedVehicleMilesValidator);
  Event.validate('elapsedEngineHours', elapsedEngineHoursValidator);
  Event.validate('distSinceLastValidCoords',
  distanceSinceLastValidCoordinatesValidator);
  Event.validate('annotation', annotationValidator);
  Event.validate('dataCheckValue', eventDataCheckValueValidator);
  Event.validate('totalVehicleMiles', totalVehicleMilesValidator);
  Event.validate('annotation', annotationValidator);
  Event.validate('totalEngineHours', totalEngineHoursValidator);
  Event.validate('timeZoneOffsetUtcValidator', timeZoneOffsetUtcValidator);
  Event.validate('shippingDocNumber', shippingDocNumberValidator,
  {message: "shippingDocNumber can't be blank"});
  Event.validate('driverLocationDescription',
  driverLocationDescriptionValidator,
  {message: "driverLocationDescription can't be blank"});
  Event.validatesLengthOf('shippingDocNumber', {min: 0, max: 40});
  Event.validatesLengthOf('driverLocationDescription', {min: 5, max: 60});

  Event.softPatch = function(id, data, cb) {
    Event.findById(id, function(err, originalEvent) {
      if (err) {
        return cb(err);
      }
      if (!originalEvent) {
        err = Error('Event not found');
        err.statusCode = '404';
        cb(err, 'Event not found');
      } else {
        // Duplicate datal
        console.log(originalEvent.__data);
        let duplicatedData = Object.assign({}, originalEvent.__data);
        delete duplicatedData.id;
        // Create Referece with original event and update data
        duplicatedData.referenceId = originalEvent.__data.id;
        duplicatedData.recordOrigin = 2;
        console.log(duplicatedData);
        // Set original event to updated status
        originalEvent.updateAttribute('recordStatus', 2,
         function(err, _) {
           if (err) throw err;
         });
        // Create a new duplicated instance from original event
        Event.create(duplicatedData, function(err, instance) {
          if (err) cb(err);
          console.log(instance);
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
