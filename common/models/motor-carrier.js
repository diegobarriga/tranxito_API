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

	Motorcarrier.getSupervisors = function(id, cb) {
		Motorcarrier.app.models.Person.find({where: {motorCarrierId: id, account_status: true, account_type: 'S'}}, function(err, data) {
			cb(err, data);
		})
	}

	Motorcarrier.remoteMethod('getSupervisors', {
    accepts: {arg: 'id', type: 'string'},
    returns: {arg: 'data', type: 'string', root: true},
    http: {path: '/:id/supervisors', verb: 'get'},
    description: ["get all non archived supervisors (account_type: 'S', account_status: true) from the Motorcarrier with the required id"]
	});

  Motorcarrier.getDrivers = function(id, cb) {
    Motorcarrier.app.models.Person.find({where: {motorCarrierId: id, account_status: true, account_type: 'D'}}, function(err, data) {
      cb(err, data);
    })
  }

  Motorcarrier.remoteMethod('getDrivers', {
    accepts: {arg: 'id', type: 'string'},
    returns: {arg: 'data', type: 'string', root: true},
    http: {path: '/:id/drivers', verb: 'get'},
    description: ["get all non archived drivers (account_type: 'D', account_status: true) from the Motorcarrier with the required id"]
  });

};
