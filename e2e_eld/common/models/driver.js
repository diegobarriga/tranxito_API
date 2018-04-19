'use strict';
import validator from 'validator';

function time_zone_offset_utc_validator(err) {
  if (!validator.isInt(String(this.time_zone_offset_utc), { min: 4, max: 11})) return err();
}

module.exports = function(Driver) {
  Driver.validatesPresenceOf('driver_license_number', 'licenses_issuing_state', 'account_status', {"message": "Can't be blank"});
  Driver.validatesNumericalityOf('time_zone_offset_utc', {int: true});
  Driver.validatesInclusionOf('exempt_driver_configuration', {in: ['E', '0']});
};
