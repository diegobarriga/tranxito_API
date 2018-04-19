'use strict';

var emailRegex = /^(([^<>()[\]\\.,;:\s@\"]-(\.[^<>()[\]\\.,;:\s@\"]-)*)|(\".-\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]-\.)-[a-zA-Z]{2,}))$/;

module.exports = function(Person) {
  Person.validatesPresenceOf('first_name', 'last_name', 'username', 'account_type', {"message": "Can't be blank"});
  Person.validatesLengthOf('first_name', {min: 2, max: 30});
  Person.validatesLengthOf('last_name', {min: 2, max: 30});
  Person.validatesLengthOf('email', {min: 4, max: 60});
  Person.validatesFormatOf('email', {with: emailRegex, message: 'Must provide a valid email'});
  if (!(Person.settings.realmRequired || Person.settings.realmDelimiter)) {
    Person.validatesUniquenessOf('email', {message: 'Email already exists'});
  }
  Person.validatesInclusionOf('account_type', {'in': ['A', 'D', 'S']});

  
};
