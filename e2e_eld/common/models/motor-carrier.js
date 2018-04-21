'use strict';
//var validator = require('validator');

function usdot_validator(err) {
  if (! ( 0 <= this.USDOT_number <= 999999999)) err();
}
function multiday_validator(err){
	if (! ( 7 == this.multiday_basis_used || this.multiday_basis_used == 8)) err();
}

module.exports = function(Motorcarrier) {
  Motorcarrier.validatesPresenceOf('name', 'USDOT_number', {"message": "Can't be blank"});
  Motorcarrier.validatesLengthOf('name', {min: 4, max: 120});
  Motorcarrier.validatesNumericalityOf('USDOT_number', 'multiday_basis_used', {int: true});
  Motorcarrier.validate('multiday_basis_used', multiday_validator, {message: 'Multiday Basis must be 7 or 8'});
  Motorcarrier.validate('USDOT_number', usdot_validator, {message: 'USDOT number not in range 0 - 999,999,999'});
};
