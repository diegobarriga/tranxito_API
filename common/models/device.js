'use strict';
var validator = require('validator');
var imei = require('imei');

function macAddressValidator(err) {
  if (!validator.isMACAddress(String(this.bluetooth_mac))) return err();
}

// function imeiValidator(err) {
//   if (!imei.isValid(String(this.imei))) return err();
// }

module.exports = function(Device) {
  Device.validatesUniquenessOf('imei', {message: 'Imei already exists'});
  Device.validatesUniquenessOf('bluetooth_mac',
  {message: 'Bluetooth MAC already exists'}
  );
  Device.validatesPresenceOf(
    'bluetooth_mac',
    'imei',
    'state',
    {'message': "Can't be blank"}
  );
  Device.validate('bluetooth_mac', macAddressValidator);
  // Device.validate('imei', imeiValidator);
  Device.newConfig = function(id, script, cb) {
    Device.findById(id, function(err, device) {
      if (err) {
        return cb(err);
      }
      if (!device) {
        err = Error('Device not found');
        err.statusCode = '404';
        cb(err, 'Device not found');
      } else {
        device.configuration_script = script;
        device.configuration_status = false;
        device.save(function(error, obj) {
          if (error) cb(error);
          cb(null, 'Configuration Script set correctly');
        });
      }
    });
  };

  Device.remoteMethod(
    'newConfig',
    {
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'script', type: 'string', required: true},
      ],
      http: {path: '/:id/new_config', verb: 'post'},
      returns: {arg: 'message', type: 'string'},
    });

  Device.validConfig = function(id, cb) {
    Device.findById(id, function(err, device) {
      if (err) {
        return cb(err);
      }
      if (!device) {
        err = Error('Device not found');
        err.statusCode = '404';
        cb(err, 'Device not found');
      } else {
        device.configuration_status = true;
        device.save(function(error, obj) {
          if (error) cb(error);
          cb(null, 'Configuration set as valid');
        });
      }
    });
  };

  Device.remoteMethod(
    'validConfig',
    {
      accepts: {arg: 'id', type: 'number', required: true},
      http: {path: '/:id/valid_config', verb: 'get'},
      returns: {arg: 'message', type: 'string'},
    });
};
