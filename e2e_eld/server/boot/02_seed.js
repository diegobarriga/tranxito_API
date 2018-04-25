

module.exports = async function(app) {
  //data sources
  var mongoDs = app.dataSources.mongoDB;
  var postgresDs = app.dataSources.postgresDB;

  var carriers = createCarriers(function(err) {
    if (err) throw err;
    console.log('> models created sucessfully');
  });
  var carriers = await carriers.then(function(res){
    return res;
  })
  console.log(carriers);

  var people = createPeople(carriers, function(err) {
    if (err) throw err;
    console.log('> models created sucessfully');
  });
  var people = await people.then(function(res){
    return res;
  })

  console.log(people);

  var vehicles = createVehicles(carriers, function(err) {
    if (err) throw err;
    console.log('> models created sucessfully');
  });
  var vehicles = await vehicles.then(function(res){
    return res;
  })

  console.log(vehicles);

  var events = createEvents(people, vehicles, function(err) {
    if (err) throw err;
    console.log('> models created sucessfully');
  });
  var events = await events.then(function(res){
    return res;
  })

  console.log(events);

  //create carriers
  async function createCarriers(cb) {
    await postgresDs.automigrate('MotorCarrier');

    var Carrier = app.models.MotorCarrier;
    var motor_carriers = await Carrier.create([
      { "name": "E2EGroup", "USDOT_number": 0, "multiday_basis_used": 7},
      { "name": "DCCGroup", "USDOT_number": 12, "multiday_basis_used": 8}
      ]);  

    console.log('motor carrier created!')
    return motor_carriers;
  }


  //create people
  async function createPeople(carriers, cb) {
    await postgresDs.automigrate('Person');

    var Person = app.models.Person;
    var people = await Person.create([
    {
      "first_name": "Andres", "last_name": "Flores",
      "email": "aflores@gmail.com", "account_type": "A",
      "username": "aflores", "emailVerified": true,
      "motorCarrierId": carriers[0].id, "password": "1234" 
    },
    {
      "first_name": "Fernando", "last_name": "Diaz",
      "email": "fdiaz@gmail.com", "account_type": "S",
      "username": "fdiaz", "emailVerified": true,
      "motorCarrierId": carriers[0].id, "password": "1234" 
    },
    {
      "first_name": "Pablo", "last_name": "Sanchez",
      "email": "pablo.sanchez@gmail.com", "account_type": "D",
      "username": "pablo.sanchez", "emailVerified": true,
      "motorCarrierId": carriers[0].id, "password": "1234",
      "driver_license_number": "10234502", "licenses_issuing_state": "Santiago",
      "account_status": true, "exempt_driver_configuration": "E",
      "time_zone_offset_utc": 5, "starting_time_24_hour_period": Date.now(),
      "move_yards_use": true, "default_use": true, "personal_use": true

    },
    {
      "first_name": "Andrea", "last_name": "Fernandez",
      "email": "afdez@gmail.com", "account_type": "A",
      "username": "afdez", "emailVerified": true,
      "motorCarrierId": carriers[1].id, "password": "1234" 
    },
    {
      "first_name": "Bernardo", "last_name": "Perez",
      "email": "bperez@gmail.com", "account_type": "S",
      "username": "bperez", "emailVerified": true,
      "motorCarrierId": carriers[1].id, "password": "1234" 
    },
    {
      "first_name": "Pedro", "last_name": "Lopez",
      "email": "pedro.lopez@gmail.com", "account_type": "D",
      "username": "pedro.lopez", "emailVerified": true,
      "motorCarrierId": carriers[1].id, "password": "1234",
      "driver_license_number": "10255321", "licenses_issuing_state": "Santiago", 
      "account_status": true, "exempt_driver_configuration": "E",
      "time_zone_offset_utc": 4, "starting_time_24_hour_period": Date.now(), 
      "move_yards_use": false, "default_use": true, "personal_use": false
    }
    ]);
    console.log('people created!');
    return people;
  }


  //create vehicles
  async function createVehicles(carriers, cb) {
    await postgresDs.automigrate('Vehicle');

    var Vehicle = app.models.Vehicle;
    var vehicles = [
    {
      "vin": "A1B2C3A1B2C3A1B2C3",
      "CMV_power_unit_number": "00110022",
      "model": "Truck",
      "car_maker": "BMW",
      "plaque": "BBCC23",
      "state": "Santiago",
      "IMEI_ELD": 0,
      "motorCarrierId": carriers[0].id
    },
    {
      "vin": "GHI323ACD123O1PQR2",
      "CMV_power_unit_number": "00330001",
      "model": "Bus",
      "car_maker": "Mercedez",
      "plaque": "XL3456",
      "state": "Santiago",
      "IMEI_ELD": 12,
      "motorCarrierId": carriers[1].id
    }

    ];

    var vehicle = await Vehicle.create(vehicles);
    console.log('vehicles created!');
    return vehicle;
  }

  //create events
  async function createEvents(people, vehicles, cb) {
    await mongoDs.automigrate('Event');

    var Event = app.models.Event;
    var today = new Date();

    var data = [
              // event type 6
          {
          "event_sequence_id_number": 0,
          "event_type": 6,
          "event_code": 1,
          "event_timestamp": today,
          "shipping_doc_number": "AAEECC1234",
          "event_record_status": 1,
          "accumulated_vehicle_miles": 0,
          "elapsed_engine_hours": 0,
          "coordinates": {
            "lat": 40.32,
            "lng": -70.65
          },
          "distance_since_last_valid_coordinates": 4,
          "malfunction_indicator_status": false,
          "data_diagnostic_event_indicator_status_for_driver": false,
          "event_data_check_value": 0,
          "annotation": "evento prueba tipo 1",
          "driver_location_description": "Avenida Las Condes 324",
          "total_vehicle_miles": 100,
          "total_engine_hours": 3.5,
          "time_zone_offset_utc": 4,
          "date_of_certified_record": "2018-04-21T23:30:20.660Z",
          "event_report_status": true,
          "certified": false,
          "driverId": people[2].id,
          "vehicleId": vehicles[0].id,
          "motorCarrierId": vehicles[0].motorCarrierId
          },

              // event type 5
          {
          "event_sequence_id_number": 1,
          "event_type": 5,
          "event_code": 1,
          "event_timestamp": today.setMinutes(today.getMinutes() + 2),
          "shipping_doc_number": "AAEECC1234",
          "event_record_status": 1,
          "accumulated_vehicle_miles": 0,
          "elapsed_engine_hours": 0,
          "coordinates": {
            "lat": 40.32,
            "lng": -70.65
          },
          "distance_since_last_valid_coordinates": 4,
          "malfunction_indicator_status": false,
          "data_diagnostic_event_indicator_status_for_driver": false,
          "event_data_check_value": 0,
          "annotation": "evento prueba tipo 1",
          "driver_location_description": "Avenida Las Condes 324",
          "total_vehicle_miles": 100,
          "total_engine_hours": 3.5,
          "time_zone_offset_utc": 4,
          "date_of_certified_record": "2018-04-21T23:30:20.660Z",
          "event_report_status": true,
          "certified": false,
          "driverId": people[2].id,
          "vehicleId": vehicles[0].id,
          "motorCarrierId": vehicles[0].motorCarrierId
          },
          // event type 1
          {
          "event_sequence_id_number": 2,
          "event_type": 1,
          "event_code": 3,
          "event_timestamp": today.setMinutes(today.getMinutes() + 2),
          "shipping_doc_number": "AAEECC1234",
          "event_record_status": 1,
          "accumulated_vehicle_miles": 0,
          "elapsed_engine_hours": 0,
          "coordinates": {
            "lat": 40.32,
            "lng": -70.65
          },
          "distance_since_last_valid_coordinates": 4,
          "malfunction_indicator_status": false,
          "data_diagnostic_event_indicator_status_for_driver": false,
          "event_data_check_value": 0,
          "annotation": "evento prueba tipo 1",
          "driver_location_description": "Avenida Las Condes 324",
          "total_vehicle_miles": 100,
          "total_engine_hours": 3.5,
          "time_zone_offset_utc": 4,
          "date_of_certified_record": "2018-04-21T23:30:20.660Z",
          "event_report_status": true,
          "certified": false,
          "driverId": people[2].id,
          "vehicleId": vehicles[0].id,
          "motorCarrierId": vehicles[0].motorCarrierId
          },
          // event type 2

          {
          "event_sequence_id_number": 3,
          "event_type": 2,
          "event_code": 1,
          "event_timestamp": today.setHours(today.getHours()+ 1),
          "shipping_doc_number": "AAEECC1234",
          "event_record_status": 1,
          "accumulated_vehicle_miles": 50,
          "elapsed_engine_hours": 1,
          "coordinates": {
            "lat": 42.32,
            "lng": -71.65
          },
          "distance_since_last_valid_coordinates": 2,
          "malfunction_indicator_status": false,
          "data_diagnostic_event_indicator_status_for_driver": false,
          "event_data_check_value": 0,
          "annotation": "evento prueba tipo 1",
          "driver_location_description": "Avenida Las Condes 324",
          "total_vehicle_miles": 150,
          "total_engine_hours": 4.5,
          "time_zone_offset_utc": 4,
          "date_of_certified_record": "2018-04-22T00:30:20.660Z",
          "event_report_status": true,
          "certified": false,
          "driverId": people[2].id,
          "vehicleId": vehicles[0].id,
          "motorCarrierId": vehicles[0].motorCarrierId
          },

          //event type 3
          {
          "event_sequence_id_number": 4,
          "event_type": 3,
          "event_code": 1,
          "event_timestamp": today.setHours(today.getHours()+ 1),
          "shipping_doc_number": "AAEECC1234",
          "event_record_status": 1,
          "accumulated_vehicle_miles": 100,
          "elapsed_engine_hours": 2,
          "coordinates": {
            "lat": 43.32,
            "lng": -71.85
          },
          "distance_since_last_valid_coordinates": 2,
          "malfunction_indicator_status": false,
          "data_diagnostic_event_indicator_status_for_driver": false,
          "event_data_check_value": 0,
          "annotation": "evento prueba tipo 1",
          "driver_location_description": "Avenida Las Condes 324",
          "total_vehicle_miles": 200,
          "total_engine_hours": 5.5,
          "time_zone_offset_utc": 4,
          "date_of_certified_record": "2018-04-21T23:30:20.660Z",
          "event_report_status": true,
          "certified": false,
          "driverId": people[2].id,
          "vehicleId": vehicles[0].id,
          "motorCarrierId": vehicles[0].motorCarrierId
          },
          // event type 4
          {
          "event_sequence_id_number": 5,
          "event_type": 4,
          "event_code": 1,
          "event_timestamp": today,
          "shipping_doc_number": "AAEECC1234",
          "event_record_status": 1,
          "accumulated_vehicle_miles": 100,
          "elapsed_engine_hours": 2,
          "coordinates": {
            "lat": 43.32,
            "lng": -71.85
          },
          "distance_since_last_valid_coordinates": 0,
          "malfunction_indicator_status": false,
          "data_diagnostic_event_indicator_status_for_driver": false,
          "event_data_check_value": 0,
          "annotation": "evento prueba tipo 1",
          "driver_location_description": "Avenida Las Condes 324",
          "total_vehicle_miles": 200,
          "total_engine_hours": 5.5,
          "time_zone_offset_utc": 4,
          "date_of_certified_record": "2018-04-21T23:30:20.660Z",
          "event_report_status": true,
          "certified": false,
          "driverId": people[2].id,
          "vehicleId": vehicles[0].id,
          "motorCarrierId": vehicles[0].motorCarrierId
          },
          // event type 7
          {
          "event_sequence_id_number": 6,
          "event_type": 7,
          "event_code": 1,
          "event_timestamp": today,
          "shipping_doc_number": "AAEECC1234",
          "event_record_status": 1,
          "accumulated_vehicle_miles": 100,
          "elapsed_engine_hours": 2,
          "coordinates": {
            "lat": 43.32,
            "lng": -71.85
          },
          "distance_since_last_valid_coordinates": 0,
          "malfunction_indicator_status": true,
          "data_diagnostic_event_indicator_status_for_driver": false,
          "event_data_check_value": 0,
          "annotation": "evento prueba tipo 1",
          "driver_location_description": "Avenida Las Condes 324",
          "total_vehicle_miles": 200,
          "total_engine_hours": 5.5,
          "time_zone_offset_utc": 4,
          "date_of_certified_record": "2018-04-21T23:30:20.660Z",
          "event_report_status": true,
          "certified": false,
          "driverId": people[2].id,
          "vehicleId": vehicles[0].id,
          "motorCarrierId": vehicles[0].motorCarrierId
          }

    ];


    var event = await Event.create(data);

    console.log('events created!');
    return event;
    }
};