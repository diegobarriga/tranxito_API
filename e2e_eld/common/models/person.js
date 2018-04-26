'use strict';
var validator = require('validator');


function email_validator(err) {
  if(!validator.isEmail(String(this.email))) return err();
}

function validateDriverLiceseNumber(err) {
  if (this.account_type === 'D' && this.driver_license_number === undefined) err()
}

function validateLicensesIssuingState(err) {
  if (this.account_type === 'D' && this.licenses_issuing_state === undefined) err()
}

function validateAccountStatus(err) {
  if (this.account_type === 'D' && this.account_status === undefined) err()
}

function validateExemptDriverConfiguration(err) {
  if (this.account_type === 'D' && this.exempt_driver_configuration === undefined) err()
  if (this.account_type === 'D' && !['E', '0'].includes(this.exempt_driver_configuration)) err()
}

function validateTimeZoneOffsetUtc(err) {
  if (this.account_type === 'D' && this.time_zone_offset_utc === undefined) err();
  if (this.account_type === 'D' && !Number.isInteger(this.time_zone_offset_utc)) err();
  if (this.account_type === 'D' && (this.time_zone_offset_utc < 4 || this.time_zone_offset_utc > 11)) err();

}

function validateStartingTime24HourPeriod(err) {
  if (this.account_type === 'D' && this.starting_time_24_hour_period === undefined) err()
}

module.exports = function(Person) {
  Person.validatesPresenceOf('first_name', 'last_name', 'username', 'account_type', {"message": "Can't be blank"});
  Person.validatesLengthOf('first_name', {min: 2, max: 30});
  Person.validatesLengthOf('last_name', {min: 2, max: 30});
  Person.validatesLengthOf('email', {min: 4, max: 60});
  Person.validate('email', email_validator, {message: 'Must provide a valid email'});
  Person.validatesUniquenessOf('email', {message: 'Email already exists'});
  Person.validatesInclusionOf('account_type', {'in': ['A', 'D', 'S']});
  Person.validate('driver_license_number', validateDriverLiceseNumber, {"message": "Can't be blank when account_type is D"});
  Person.validate('licenses_issuing_state', validateLicensesIssuingState, {"message": "Can't be blank when account_type is D"});
  Person.validate('account_status', validateAccountStatus, {"message": "Can't be blank when account_type is D"});
  Person.validate('exempt_driver_configuration', validateExemptDriverConfiguration, {"message": "Can't be blank when account_type is D"});
  Person.validate('time_zone_offset_utc', validateTimeZoneOffsetUtc, {"message": "Can't be blank when account_type is D"});
  Person.validate('starting_time_24_hour_period', validateStartingTime24HourPeriod, {"message": "Can't be blank when account_type is D"});



};
