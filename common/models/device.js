'use strict';

module.exports = function(Device) {
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
