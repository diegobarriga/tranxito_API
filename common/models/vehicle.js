'use strict';
var validator = require('validator');
var app = require('../../server/server.js');
var _         = require('lodash');
var async     = require('async');
var csv       = require('fast-csv');
var fork      = require('child_process').fork;
var fs        = require('fs');
var path      = require('path');
var loopback  = require('loopback');
var LoopBackContext = require('loopback-context');

function vinValidator(err) {
  if (this.vin != '' && (this.vin.length > 18 || this.vin.length < 17))
    return err();
}

function CmvPowerUnitNumberValidator(err) {
  if (this.imeiEld && !this.CmvPowerUnitNumber &&
    this.CmvPowerUnitNumber.trim() === '') return err();
}

module.exports = function(Vehicle) {
  Vehicle.validate('vin', vinValidator);
  Vehicle.validatesUniquenessOf('vin', {message: 'VIN already exists'});
  Vehicle.validatesNumericalityOf('imeiEld', {int: true});
  Vehicle.validatesLengthOf('CmvPowerUnitNumber', {min: 1, max: 10});
  Vehicle.validate('CmvPowerUnitNumber', CmvPowerUnitNumberValidator,
    {'message': "Can't be blank if connected to ELD"});

  Vehicle.observe('after save', function(context, next) {
    app.models.LastMod.findOne({}, function(err, LastMod) {
      if (err) throw (err);
      LastMod.vehicles = Date.now();
      LastMod.save(function(error, LM) {
        if (error) throw (error);
        next();
      });
    });
  });

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
      {arg: 'image', type: 'string', required: true},
    ],
    returns: {arg: 'message', type: 'string'},
    http: {path: '/:id/setImage', verb: 'post'},
  });
};
