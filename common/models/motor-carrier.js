'use strict';
var validator = require('validator');

function usdot_validator(err) {
  if (!validator.isInt(String(this.USDOT_number), {min: 0, max: 999999999})) err();
}

module.exports = function(Motorcarrier) {
  Motorcarrier.validatesPresenceOf('name', 'USDOT_number','multiday_basis_used', {"message": "Can't be blank"});
  Motorcarrier.validatesLengthOf('name', {min: 4, max: 120});
  Motorcarrier.validatesNumericalityOf('USDOT_number', 'multiday_basis_used', {int: true});
  Motorcarrier.validatesInclusionOf('multiday_basis_used', {in: [7, 8]});
  Motorcarrier.validate('USDOT_number', usdot_validator, {message: 'USDOT number not in range 0 - 999,999,999'});

	Motorcarrier.getPeople = function(id, cb) {
		Motorcarrier.app.models.Person.find({where: {motorCarrierId: id, account_status: true}}, function(err, data) {
			cb(err, data);
		})
	}

	Motorcarrier.remoteMethod('getPeople', {
    accepts: {arg: 'id', type: 'string'},
    returns: {arg: 'data', type: 'string', root: true},
    http: {path: '/:id/people', verb: 'get'}
	});
};
