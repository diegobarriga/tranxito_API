'use strict';
var validator = require('validator');
var imei = require('imei');
var app = require('../../server/server.js');

function macAddressValidator1(err) {
  if (this.bluetoothMac && this.bluetoothMac.trim() === '') return err();
}

function macAddressValidator2(err) {
  if (!validator.isMACAddress(String(this.bluetoothMac).trim())) return err();
}

function configScriptValidator(err) {
  if (this.configScript && this.configScript.trim() === '') return err();
}

// function imeiValidator(err) {
//   if (!imei.isValid(String(this.imei)) return err();
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
  Device.validate('bluetoothMac', macAddressValidator1,
  {message: "Device Bluetooth MAC can't be blank"});
  Device.validate('bluetoothMac', macAddressValidator2,
  {message: 'Invalid Bluetooth MAC address'});
  Device.validate('configScript', configScriptValidator,
  {message: "Device config script can't be blank"});
  // Device.validate('imei', imeiValidator);

  Device.observe('after save', function(context, next) {
    app.models.LastMod.findOne({}, function(err, LastMod) {
      if (err) throw (err);
      var NOW = Date.now();
      LastMod.devices = NOW;
      LastMod.save(function(error) {
        if (error) throw (error);
        next();
      });
    });
  });

/*
  Device.afterRemote('**', function(ctx, modelInstance, next) {
    app.models.LastMod.findOne({}, function(err, LastMod) {
      ctx.res.set('LastMod', LastMod.device.toISOString());
      next();
    });
  });
*/
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
      http: {path: '/:id/newConfig', verb: 'post'},
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
      http: {path: '/:id/validConfig', verb: 'get'},
      returns: {arg: 'message', type: 'string'},
    });

  Device.linkVehicle = function(id, vehicleId, cb) {
    Device.findById(id, function(err, device) {
      if (err) return cb(err);
      if (!device) {
        err = Error('Device not found');
        err.statusCode = '404';
        cb(err, 'Device not found');
      } else {
        app.models.Vehicle.findById(vehicleId,  function(err, vehicle) {
          if (err) return cb(err);
          if (!vehicle) {
            err = Error('Vehicle not found');
            err.statusCode = '404';
            cb(err, 'Vehicle not found');
          } else {
            vehicle.devices(function(err, dev) {
              if (err) cb(err);
              if (dev) {
                dev.vehicleId = null;
                dev.save();
              }
            });
            device.vehicle(vehicle);
            device.save();
            cb(null, `Device ${device.id} linked to vehicle ${vehicle.id}`);
          }
        });
      }
    });
  };

  Device.remoteMethod(
    'linkVehicle',
    {
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'vehicleId', type: 'number', required: true},
      ],
      http: {path: '/:id/linkVehicle', verb: 'post'},
      returns: {arg: 'message', type: 'string'},
    });
};
