'use strict';

function usdot_validator(err) {
    if (this.USDOT_number > 999999999 || this.USDOT_number < 0) err();
});)

module.exports = function(Motorcarrier) {
  Motorcarrier.validatesPresenceOf('name', 'USDOT_number', {"message": "Can't be blank"});
  Motorcarrier.validatesLengthOf('name', {min: 4, max: 120});
  Motorcarrier.validatesNumericalityOf('USDOT_number', 'multiday_basis_used', {int: true});
  Motorcarrier.validatesExclusionOf('multiday_basis_used', {in: [7, 8]});
  Motorcarrier.validate('USDOT_number', usdot_validator, {message: 'USDOT number not in range 0 - 999,999,999'});
};
