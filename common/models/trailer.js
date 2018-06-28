'use strict';
var validator = require('validator');

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
  if (this.number.trim().length > 10 ||
    this.number.trim().length == 0) return err();
}

function gvwtValidator(err) {
  if (!validator.isInt(String(this.gvw), {min: 0}))
    return err();
}

function yearValidator(err) {
  let now = new Date();
  let thisYear = now.getUTCFullYear();
  if (this.year && !validator.isInt(String(this.year),
    {min: 1900, max: thisYear}))
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
};
