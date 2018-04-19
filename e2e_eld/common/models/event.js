'use strict';

module.exports = function(Event) {
  Event.validatesPresenceOf('event_code', 'event_timestamp', 'shipping_doc_number', {"message": "Can't be blank"});
  Event.validatesNumericalityOf(
    'event_sequence_id_number',
    'event_record_status',
    'event_type',
    'event_code',
    'accumulated_vehicle_miles',
    'distance_since_last_valid_coordinates',
    'event_data_check_value',
    'shipping_doc_number'
     {int: true});
};
