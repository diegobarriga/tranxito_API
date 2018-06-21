'use strict';
var validator = require('validator');

function vinValidator(err) {
  if (this.vin != '' && (this.vin.trim().length > 18 ||
  this.vin.trim().length < 17))
    return err();
}

function modelValidator(err) {
  if (this.model != '' && this.model.trim() == '') return err;
}

function manufacturerValidator(err) {
  if (this.manufacturer != '' && this.manufacturer.trim() == '') return err;
}

function numberValidator(err) {
  if (this.number.trim().length > 10 ||
    this.number.trim().length == 0) return err;
}

function gvwtValidator(err) {
  if (!validator.isInt(String(this.gvw), {min: 0}))
    err();
}

module.exports = function(Trailer) {
  Trailer.validate('vin', vinValidator);
  Trailer.validate('model', modelValidator);
  Trailer.validate('manufacturer', manufacturerValidator);
  Trailer.validate('gvw', gvwtValidator);
  Trailer.validate('number', numberValidator);
  Trailer.validatesPresenceOf('number');
};
