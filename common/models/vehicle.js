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
  if (this.vin != '' && (this.vin.trim().length > 18 ||
  this.vin.trim().length < 17))
    return err();
}

function CmvPowerUnitNumberValidator(err) {
  if (this.imeiEld && !this.CmvPowerUnitNumber &&
    this.CmvPowerUnitNumber.trim() === '') return err();
}

function yearValidator(err) {
  let now = new Date();
  let thisYear = now.getUTCFullYear();
  if (this.year && !validator.isInt(String(this.year),
    {min: 1900, max: thisYear}))
    return err();
}

module.exports = function(Vehicle) {
  Vehicle.validate('vin', vinValidator);
  Vehicle.validatesUniquenessOf('vin', {message: 'VIN already exists'});
  Vehicle.validatesNumericalityOf('imeiEld', {int: true});
  Vehicle.validatesLengthOf('CmvPowerUnitNumber', {min: 1, max: 10});
  Vehicle.validate('year', yearValidator);
  Vehicle.validate('CmvPowerUnitNumber', CmvPowerUnitNumberValidator,
    {'message': "Can't be blank if connected to ELD"});

  Vehicle.observe('after save', function(context, next) {
    app.models.LastMod.findOne({}, function(err, LastMod) {
      if (err) throw (err);
      var NOW = Date.now();
      var currentContext = LoopBackContext.getCurrentContext();
      LastMod.vehicles = NOW;
      if (currentContext) currentContext.set('timestamp', NOW);
      LastMod.save(function(error) {
        if (error) throw (error);
        next();
      });
    });
  });

  Vehicle.afterRemote('**', function(ctx, modelInstance, next) {
    var currentContext = LoopBackContext.getCurrentContext();
    app.models.LastMod.findOne({}, function(err, LastMod) {
      ctx.res.set('LastMod', LastMod.vehicle);
      next();
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
