'use strict';

function vin_validator(err) {
  if (this.vin != "" && (this.vin.length > 18 || this.vin.length < 17)) return err();
}

function CMV_power_unit_number_validator(err) {
  if (this.IMEI_ELD && !this.CMV_power_unit_number) return err();
}

module.exports = function(Vehicle) {
  // Vehicle.validate('vin', vin_validator);
  Vehicle.validatesNumericalityOf('IMEI_ELD', {int: true});
  Vehicle.validatesLengthOf('CMV_power_unit_number', {min: 1, max: 10});
  Vehicle.validate('CMV_power_unit_number', CMV_power_unit_number_validator, {"message": "Can't be blank if connected to ELD"});


  Vehicle.setImage = function(id, image, cb) {
    Vehicle.findById(id, function(err, vehicle) {
      if (err) {
        cb(err, 'Vehicle not found');
      } else {
      vehicle.image = image;
      vehicle.save();
      cb(null, 'Image set correctly');
      }
    });
  };

  Vehicle.remoteMethod('setImage', {
    accepts: [
      {arg: 'id', type: 'number', required: true},
      {arg: 'image', type: 'string', required: true}
    ],
    returns: {arg: 'message', type: 'string'},
    http: {path: '/:id/setImage', verb: 'post'}
  });

};
