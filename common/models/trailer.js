'use strict';
var validator = require('validator');
var app = require('../../server/server.js');

function vinValidator(err) {
  if (this.vin != '' && (this.vin.trim().length > 18 ||
  this.vin.trim().length < 17))
    return err();
}

function modelValidator(err) {
  if (this.model != '' && this.model.trim() == '') return err();
}

function manufacturerValidator(err) {
  if (this.manufacturer != '' && this.manufacturer.trim() == '') return err();
}

function numberValidator(err) {
  if (this.number && (this.number.trim().length > 10 ||
    this.number.trim().length == 0)) return err();
}

function gvwtValidator(err) {
  if (!validator.isInt(String(this.gvw), {min: 0}))
    return err();
}

function yearValidator(err) {
  let now = new Date();
  let thisYear = now.getUTCFullYear();
  if (this.year && !validator.isInt(String(this.year),
    {min: 1900, max: thisYear + 1}))
    return err();
}

module.exports = function(Trailer) {
  Trailer.validate('vin', vinValidator);
  Trailer.validatesUniquenessOf('vin', {message: 'VIN already exists'});
  Trailer.validatesUniquenessOf('number',
  {message: 'Serial No already exists'});
  Trailer.validate('model', modelValidator,
  {message: "Model can't be blank"});
  Trailer.validate('manufacturer', manufacturerValidator,
  {message: "Manufacturer can't be blank"});
  Trailer.validate('gvw', gvwtValidator);
  Trailer.validate('number', numberValidator);
  Trailer.validate('year', yearValidator,
  {message: 'Invalid year of manufacture'});
  Trailer.validatesPresenceOf('number');

  Trailer.setImage = function(id, image, cb) {
    Trailer.findById(id, function(err, trailer) {
      if (err) {
        cb(err, 'Trailer not found');
      } else {
        trailer.image = image;
        trailer.save();
        cb(null, 'Image set correctly');
      }
    });
  };

  Trailer.remoteMethod('setImage', {
    accepts: [
      {arg: 'id', type: 'number', required: true},
      {arg: 'image', type: 'string', required: true},
    ],
    returns: {arg: 'message', type: 'string'},
    http: {path: '/:id/setImage', verb: 'post'},
  });

  Trailer.linkVehicle = function(id, vehicleId, cb) {
    Trailer.findById(id, function(err, trailer) {
      if (err) return cb(err);
      if (!trailer) {
        err = Error('Trailer not found');
        err.statusCode = '404';
        cb(err, 'Trailer not found');
      } else {
        app.models.Vehicle.findById(vehicleId,  function(err, vehicle) {
          if (err) return cb(err);
          if (!vehicle) {
            err = Error('Vehicle not found');
            err.statusCode = '404';
            cb(err, 'Vehicle not found');
          } else {
            vehicle.trailer(function(err, tr) {
              if (err) cb(err);
              if (tr) {
                tr.vehicleId = null;
                tr.save();
              }
            });
            trailer.vehicle(vehicle);
            trailer.save();
            cb(null, `Trailer ${trailer.id} linked to vehicle ${vehicle.id}`);
          }
        });
      }
    });
  };

  Trailer.remoteMethod(
    'linkVehicle',
    {
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'vehicleId', type: 'number', required: true},
      ],
      http: {path: '/:id/linkVehicle', verb: 'post'},
      returns: {arg: 'message', type: 'string'},
      description: ['Link trailer with a vehicle'],
    });

  Trailer.unlink = function(id, cb) {
    Trailer.findById(id, function(err, trailer) {
      if (err) cb(err);
      if (!trailer) {
        err = Error('Trailer not found');
        err.statusCode = '404';
        cb(err, 'Trailer not found');
      } else {
        trailer.vehicleId = null;
        trailer.save();
        cb(null, `Trailer ${trailer.id} succesfully unlinked`);
      }
    });
  };

  Trailer.remoteMethod(
    'unlinkVehicle',
    {
      accepts: {arg: 'id', type: 'number', required: true},
      http: {path: '/:id/unlink', verb: 'post'},
      returns: {arg: 'message', type: 'string'},
      description: ["Unlink trailer's vehicle"],
    });
};
