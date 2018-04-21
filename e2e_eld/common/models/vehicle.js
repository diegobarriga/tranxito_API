'use strict';

function vin_validator(err) {
  if (this.vin != "" && (this.vin.length == 18 || this.vin.length == 17)) return err();
}

module.exports = function(Vehicle) {
  Vehicle.validate('vin', vin_validator);
  Vehicle.validatesNumericalityOf('IMEI_ELD', {int: true});
  Vehicle.validatesLengthOf('CMV_power_unit_number', {min: 1, max: 10});
};
