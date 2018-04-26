'use strict';
var validator = require('validator');

function event_type_validator(err) {
  if (!validator.isInt(String(this.event_type), { min: 1, max: 7})) return err();
}

function event_code_validator(err) {
  let dict = {
    1: {
      min: 1,
      max: 4
    },
    2: {
      min: 1,
      max: 2
    },
    3: {
      min: 0,
      max: 2
    },
    4: {
      min: 1,
      max: 9
    },
    5: {
      min: 1,
      max: 2
    },
    6: {
      min: 1,
      max: 4
    },
    7: {
      min: 1,
      max: 4
    }
  };
  if (!this.event_type || !validator.isInt(String(this.event_code), { min: dict[this.event_type].min, max: dict[this.event_type].max})) return err();
}


function event_record_status_validator(err) {
  if (!validator.isInt(String(this.event_record_status), { min: 1, max: 4})) return err();
}

function accumulated_vehicle_miles_validator(err) {
  if (!validator.isInt(String(this.accumulated_vehicle_miles), { min: 0, max: 9999})) return err();
}

function elapsed_engine_hours_validator(err) {
  if (!validator.isFloat(String(this.elapsed_engine_hours), { min: 0.0, max: 99.9}) ||
   !validator.isInt(String((this.elapsed_engine_hours*10) % 1))) return err();
}

function distance_since_last_valid_coordinates_validator(err) {
  if (!validator.isInt(String(this.distance_since_last_valid_coordinates), { min: 0, max: 6})) return err();
}

function annotation_validator(err) {
  if ((this.annotation && this.annotation.length < 4) || (this.annotation && this.annotation.length > 60)) return err();
}

function event_data_check_value_validator(err) {
  if (!validator.isInt(String(this.event_data_check_value), { min: 0, max: 255})) return err();
}

function total_vehicle_miles_validator(err) {
  if (!validator.isInt(String(this.total_vehicle_miles), { min: 0, max: (9999999)})) return err();
  else if (this.total_vehicle_miles < this.accumulated_vehicle_miles) return err();
}

function total_engine_hours_validator(err) {
  if (!validator.isFloat(String(this.total_engine_hours), { min: 0.0, max: 99999.9}) ||
   !validator.isInt(String((this.total_engine_hours*10) % 1))) return err();
   else if (this.total_engine_hours < this.elapsed_engine_hours) return err();
}

function time_zone_offset_utc_validator(err) {
  if (!validator.isInt(String(this.time_zone_offset_utc), { min: 4, max: 11})) return err();
}

function diagnostic_code_validator(err) {
  let val_array = ['P', 'E', 'T', 'L', 'R', 'S', 'O', '1', '2', '3', '4', '5','6'];
  if (this.diagnostic_code && !val_array.includes(this.diagnostic_code)) return err();
}

module.exports = function(Event) {
  Event.validatesPresenceOf(
    'event_sequence_id_number',
    'event_type',
    'event_timestamp',
    'event_code',
    'event_timestamp',
    'shipping_doc_number',
    {"message": "Can't be blank"}
  );
  Event.validatesNumericalityOf(
    'event_sequence_id_number',
    'event_record_status',
    'event_type',
    'event_code',
    'accumulated_vehicle_miles',
    'distance_since_last_valid_coordinates',
    'event_data_check_value',
    'total_vehicle_miles',
    'time_zone_offset_utc',
     {int: true}
   );
  
   Event.validate('event_type', event_type_validator);
   Event.validate('event_code', event_code_validator);
   Event.validate('event_record_status', event_record_status_validator);
   Event.validate('accumulated_vehicle_miles', accumulated_vehicle_miles_validator);
   Event.validate('elapsed_engine_hours', elapsed_engine_hours_validator);
   Event.validate('distance_since_last_valid_coordinates', distance_since_last_valid_coordinates_validator);
   Event.validate('annotation', annotation_validator);
   Event.validate('event_data_check_value', event_data_check_value_validator);
   Event.validate('total_vehicle_miles', total_vehicle_miles_validator);
   Event.validate('annotation', annotation_validator);
   Event.validate('total_engine_hours', total_engine_hours_validator);
   Event.validate('time_zone_offset_utc_validator', time_zone_offset_utc_validator);
   Event.validatesLengthOf('shipping_doc_number', {min: 0, max: 40});
   Event.validatesLengthOf('driver_location_description', {min: 5, max: 60});
};
