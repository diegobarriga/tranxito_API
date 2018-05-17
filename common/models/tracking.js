'use strict';
var validator = require('validator');

function speedValidator(err) {
  if (!validator.isInt(String(this.speed), {min: 0})) return err();
}

module.exports = function(Tracking) {
  Tracking.validatesPresenceOf(
    'coordinates',
    'speed',
    'timestamp',
    'speed_limit_exceeded',
    'drive_time_exceeded',
    {'message': "Can't be blank"}
  );
  Tracking.validate('speed', speedValidator);
};
