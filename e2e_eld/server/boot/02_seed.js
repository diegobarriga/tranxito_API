

module.exports = async function(app) {
  //data sources
  var mongoDs = app.dataSources.mongoDB;
  var postgresDs = app.dataSources.postgresDB;

  var carrier = createCarriers(function(err) {
    if (err) throw err;
    console.log('> models created sucessfully');
  });
  var carrier = await carrier.then(function(res){
    return res;
  })


  var people = createPeople(carrier, function(err) {
    if (err) throw err;
    console.log('> models created sucessfully');
  });
  var people = await people.then(function(res){
    return res;
  })


  var driver = createDrivers(people, function(err) {
    if (err) throw err;
    console.log('> models created sucessfully');
  });
  var driver = await driver.then(function(res){
    return res;
  })


  var vehicle = createVehicles(carrier, function(err) {
    if (err) throw err;
    console.log('> models created sucessfully');
  });
  var vehicle = await vehicle.then(function(res){
    return res;
  })

  var event = createEvents(driver, vehicle, function(err) {
    if (err) throw err;
    console.log('> models created sucessfully');
  });
  var event = await event.then(function(res){
    return res;
  })
  console.log(event)

  //create carriers
  async function createCarriers(cb) {
    await postgresDs.automigrate('MotorCarrier');

    var Carrier = app.models.MotorCarrier;
    var motor_carriers = await Carrier.create(
      { "name": "E2EGroup", "USDOT_number": 0, "multiday_basis_used": 7});  

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
      "motorCarrierId": carriers.id, "password": "1234" 
    },
    {
      "first_name": "Fernando", "last_name": "Diaz",
      "email": "fdiaz@gmail.com", "account_type": "S",
      "username": "fdiaz", "emailVerified": true,
      "motorCarrierId": carriers.id, "password": "1234" 
    },
    {
      "first_name": "Pablo", "last_name": "Sanchez",
      "email": "pablo.sanchez@gmail.com", "account_type": "D",
      "username": "pablo.sanchez", "emailVerified": true,
      "motorCarrierId": carriers.id, "password": "1234" 
    }     
    ]);
    console.log('people created!');
    return people;
  }

  //create drivers
  async function createDrivers(people, cb) {
    await postgresDs.automigrate('Driver');
    var Driver = app.models.Driver;
    var driver = await Driver.create([
    {
      "driver_license_number": "103234",
      "licenses_issuing_state": "Santiago",
      "account_status": true,
      "exempt_driver_configuration": "E",
      "time_zone_offset_utc": 2,
      "24_hour_period_starting_time": Date.now(),
      "move_yards_use": true,
      "default_use": true,
      "personal_use": true,
      "personId": people[2].id
    }
    ]);
    console.log('drivers created!')

    return driver;
  }


  //create vehicles
  async function createVehicles(carriers, cb) {
    await postgresDs.automigrate('Vehicle');

    var Vehicle = app.models.Vehicle;
    var vehicles = 
    {
      "vin": "A1B2C3A1B2C3A1B2C3",
      "CMV_power_unit_number": "00110022",
      "model": "Truck",
      "car_maker": "BMW",
      "plaque": "BBCC23",
      "state": "Santiago",
      "IMEI_ELD": 0,
      "motorCarrierId": carriers.id
    };
    //add city if it's in the model
    // if(CoffeeShop.definition.properties.hasOwnProperty('city')){
    //   var cities = ['Vancouver', 'San Mateo'];
    //   shops.forEach(function(shop, idx){
    //     shop.city = cities[idx%2];
    //   });
    // }
    var vehicle = await Vehicle.create(vehicles);
    console.log('vehicles created!');
    return vehicle;
  }

  //create events
  async function createEvents(drivers, vehicle, cb) {
    await mongoDs.automigrate('Event');

    var Event = app.models.Event;
    var today = Date.now();

    var data = [
          // event type 1
          {
          "event_sequence_id_number": 0,
          "event_type": 1,
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
          "driverId": drivers[0].id,
          "vehicleId": vehicle.id,
          "motorCarrierId": vehicle.motorCarrierId
          },
          // event type 2

          {
          "event_sequence_id_number": 1,
          "event_type": 2,
          "event_code": 1,
          "event_timestamp": today.setHour(today.getHour()+ 1),
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
          "event_data_check_value": 1,
          "annotation": "evento prueba tipo 1",
          "driver_location_description": "Avenida Las Condes 324",
          "total_vehicle_miles": 150,
          "total_engine_hours": 4.5,
          "time_zone_offset_utc": 4,
          "date_of_certified_record": "2018-04-22T00:30:20.660Z",
          "event_report_status": true,
          "certified": false,
          "driverId": drivers[0].id,
          "vehicleId": vehicle.id,
          "motorCarrierId": vehicle.motorCarrierId
          },

          //event type 3
          {
          "event_sequence_id_number": 2,
          "event_type": 3,
          "event_code": 1,
          "event_timestamp": today.setHour(today.getHour()+ 1),
          "shipping_doc_number": "AAEECC1234",
          "event_record_status": 1,
          "accumulated_vehicle_miles": 150,
          "elapsed_engine_hours": 4.5,
          "coordinates": {
            "lat": 42.32,
            "lng": -71.65
          },
          "distance_since_last_valid_coordinates": 2,
          "malfunction_indicator_status": false,
          "data_diagnostic_event_indicator_status_for_driver": false,
          "event_data_check_value": 1,
          "annotation": "evento prueba tipo 1",
          "driver_location_description": "Avenida Las Condes 324",
          "total_vehicle_miles": 0,
          "total_engine_hours": 0,
          "time_zone_offset_utc": 4,
          "date_of_certified_record": "2018-04-21T23:30:20.660Z",
          "event_report_status": true,
          "certified": false,
          "driverId": drivers[0].id,
          "vehicleId": vehicle.id,
          "motorCarrierId": vehicle.motorCarrierId
          },


    ];


    var event = await Event.create(data);

    console.log('events created!');
    return event;
    }
};