'use strict';

function vin_validator(err) {
<<<<<<< HEAD
  if (this.vin != "" && (this.vin.length > 18 || this.vin.length < 17)) return err();
=======
  if (this.vin != "" && (this.vin.length == 18 || this.vin.length == 17)) return err();
}

function CMV_power_unit_number_validator(err) {
  if (this.IMEI_ELD && !this.CMV_power_unit_number) return err();
>>>>>>> de67ea81ce34b23dc97ea92363074d6a263ca6a1
}

module.exports = function(Vehicle) {
  Vehicle.validate('vin', vin_validator);
<<<<<<< HEAD
  Vehicle.validatesLengthOf('CMV_power_unit_number', {min: 1, max: 10});
=======
  Vehicle.validatesNumericalityOf('IMEI_ELD', {int: true});
  Vehicle.validatesLengthOf('CMV_power_unit_number', {min: 1, max: 10});
  Vehicle.validate('CMV_power_unit_number', CMV_power_unit_number_validator, {"message": "Can't be blank if connected to ELD"});
>>>>>>> de67ea81ce34b23dc97ea92363074d6a263ca6a1
};
