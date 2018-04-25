'use strict';
var validator = require('validator');

function email_validator(err) {
  if(!validator.isEmail(String(this.email))) return err();
}

module.exports = function(Person) {
  Person.validatesPresenceOf('first_name', 'last_name', 'username', 'account_type', {"message": "Can't be blank"});
  Person.validatesLengthOf('first_name', {min: 2, max: 30});
  Person.validatesLengthOf('last_name', {min: 2, max: 30});
  Person.validatesLengthOf('email', {min: 4, max: 60});
  Person.validate('email', email_validator, {message: 'Must provide a valid email'});
  Person.validatesUniquenessOf('email', {message: 'Email already exists'});
  Person.validatesInclusionOf('account_type', {'in': ['A', 'D', 'S']});
};
