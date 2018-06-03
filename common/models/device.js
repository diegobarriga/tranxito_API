'use strict';
var validator = require('validator');
var imei = require('imei');

function macAddressValidator(err) {
  if (!validator.isMACAddress(String(this.bluetoothMac))) return err();
}

// function imeiValidator(err) {
//   if (!imei.isValid(String(this.imei))) return err();
// }

module.exports = function(Device) {
  Device.validatesUniquenessOf('imei', {message: 'Imei already exists'});
  Device.validatesUniquenessOf('bluetoothMac',
  {message: 'Bluetooth MAC already exists'}
  );
  Device.validatesPresenceOf(
    'bluetoothMac',
    'imei',
    'state',
    {'message': "Can't be blank"}
  );
  Device.validate('bluetoothMac', macAddressValidator);
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
        device.configScript = script;
        device.configStatus = false;
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
        device.configStatus = true;
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
