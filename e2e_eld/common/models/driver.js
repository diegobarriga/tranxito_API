'use strict';

module.exports = function(Driver) {
  Driver.validatesPresenceOf('driver_license_number', 'licenses_issuing_state', 'account_status', {"message": "Can't be blank"});
};
