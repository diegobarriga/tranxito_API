'use strict';
var FormData = require('form-data');
var fs = require('fs');
var faker = require('faker');

module.exports = async function(app) {
  var Role = app.models.Role;
  var RoleMapping = app.models.RoleMapping;

  // data sources
  var postgresDs = app.dataSources.postgresDB;

  postgresDs.automigrate(['FileUpload', 'FileUploadError']);

  var roles = createRoles(people, function(err) {
    if (err) throw err;
    console.log('> roles created sucessfully');
  });

  await roles.then(function(res) {
    return res;
  });

  var carriers = createCarriers(function(err) {
    if (err) throw err;
    console.log('> motor carriers created sucessfully');
  });
  carriers = await carriers.then(function(res) {
    return res;
  });

  var people = createPeople(carriers, function(err) {
    if (err) throw err;
    console.log('> people created sucessfully');
  });
  people = await people.then(function(res) {
    return res;
  });

  var vehicles = createVehicles(carriers, function(err) {
    if (err) throw err;
    console.log('> vehicles created sucessfully');
  });
  vehicles = await vehicles.then(function(res) {
    return res;
  });

  var events = createEvents(people, vehicles, function(err) {
    if (err) throw err;
    console.log('> events created sucessfully');
  });
  events = await events.then(function(res) {
    return res;
  });

  fakeDrivers(20, function(err) {
    if (err) throw err;
  });

  fakeVehicles(4, function(err) {
    if (err) throw err;
  });

  console.log('Database seeded');

  // create carriers
  async function createCarriers(cb) {
    await postgresDs.automigrate('MotorCarrier');

    var Carrier = app.models.MotorCarrier;
    var motorCarriers = await Carrier.create([
      {'name': 'E2EGroup', 'USDOT_number': 0, 'multiday_basis_used': 7},
      {'name': 'DCCGroup', 'USDOT_number': 12, 'multiday_basis_used': 8},
    ]);

    console.log('motor carrier created!');
    return motorCarriers;
  }

  // create people
  async function createPeople(carriers, cb) {
    await postgresDs.automigrate('Person');

    var Person = app.models.Person;

    // RoleMapping.belongsTo(Person);
    // Person.hasOne(RoleMapping, {foreignKey: 'principalId'});
    // Role.hasMany(Person, {through: RoleMapping, foreignKey: 'roleId'});

    var people = await Person.create([
      {
        'first_name': 'Andres', 'last_name': 'Flores',
        'email': 'aflores@gmail.com', 'account_type': 'A',
        'username': 'aflores', 'emailVerified': true,
        'password': '1234',
      },
      {
        'first_name': 'Fernando', 'last_name': 'Diaz',
        'email': 'fdiaz@gmail.com', 'account_type': 'S',
        'username': 'fdiaz', 'emailVerified': true,
        'motorCarrierId': carriers[0].id, 'password': '1234',
      },
      {
        'first_name': 'Pablo', 'last_name': 'Sanchez',
        'email': 'pablo.sanchez@gmail.com', 'account_type': 'D',
        'username': 'pablo.sanchez', 'emailVerified': true,
        'motorCarrierId': carriers[0].id, 'password': '1234',
        'driver_license_number': '10234502',
        'licenses_issuing_state': 'Santiago',
        'account_status': true, 'exempt_driver_configuration': 'E',
        'time_zone_offset_utc': 5, 'starting_time_24_hour_period': Date.now(),
        'move_yards_use': true, 'default_use': true, 'personal_use': true,

      },
      {
        'first_name': 'Andrea', 'last_name': 'Fernandez',
        'email': 'afdez@gmail.com', 'account_type': 'A',
        'username': 'afdez', 'emailVerified': true,
        'password': '1234',
      },
      {
        'first_name': 'Bernardo', 'last_name': 'Perez',
        'email': 'bperez@gmail.com', 'account_type': 'S',
        'username': 'bperez', 'emailVerified': true,
        'motorCarrierId': carriers[1].id, 'password': '1234',
      },
      {
        'first_name': 'Pedro', 'last_name': 'Lopez',
        'email': 'pedro.lopez@gmail.com', 'account_type': 'D',
        'username': 'pedro.lopez', 'emailVerified': true,
        'motorCarrierId': carriers[1].id, 'password': '1234',
        'driver_license_number': '10255321',
        'licenses_issuing_state': 'Santiago',
        'account_status': true, 'exempt_driver_configuration': 'E',
        'time_zone_offset_utc': 4, 'starting_time_24_hour_period': Date.now(),
        'move_yards_use': false, 'default_use': true, 'personal_use': false,
      },
    ]
    );

    console.log('people created!');
    return people;
  }

  // create vehicles
  async function createVehicles(carriers, cb) {
    await postgresDs.automigrate('Vehicle');

    var Vehicle = app.models.Vehicle;
    var vehicles = [
      {
        'vin': 'A1B2C3A1B2C3A1B2C3',
        'CMV_power_unit_number': '00110022',
        'model': 'Truck',
        'car_maker': 'BMW',
        'plaque': 'BBCC23',
        'state': 'Santiago',
        'IMEI_ELD': 0,
        'motorCarrierId': carriers[0].id,
      },
      {
        'vin': 'GHI323ACD123O1PQR2',
        'CMV_power_unit_number': '00330001',
        'model': 'Bus',
        'car_maker': 'Mercedez',
        'plaque': 'XL3456',
        'state': 'Santiago',
        'IMEI_ELD': 12,
        'motorCarrierId': carriers[1].id,
      },

    ];

    var vehicle = await Vehicle.create(vehicles);
    console.log('vehicles created!');
    return vehicle;
  }

  // create events
  async function createEvents(people, vehicles, cb) {
    // await mongoDs.automigrate('Event');
    await postgresDs.automigrate('Event');

    var Event = app.models.Event;
    var today = new Date();

    var data = [
              // event type 6
      {
        'event_sequence_id_number': 0,
        'event_type': 6,
        'event_code': 1,
        'event_timestamp': today.setMinutes(today.getMinutes() + 0),
        'shipping_doc_number': 'AAEECC1234',
        'event_record_status': 1,
        'accumulated_vehicle_miles': 0,
        'elapsed_engine_hours': 0,
        'coordinates': {
          'lat': 40.32,
          'lng': -70.65,
        },
        'distance_since_last_valid_coordinates': 4,
        'malfunction_indicator_status': false,
        'data_diagnostic_event_indicator_status_for_driver': false,
        'event_data_check_value': 0,
        'annotation': 'evento prueba tipo 1',
        'driver_location_description': 'Avenida Las Condes 324',
        'total_vehicle_miles': 100,
        'total_engine_hours': 3.5,
        'time_zone_offset_utc': 4,
        'date_of_certified_record': '2018-04-21T23:30:20.660Z',
        'event_report_status': true,
        'certified': false,
        'driverId': people[2].id,
        'vehicleId': vehicles[0].id,
        'motorCarrierId': vehicles[0].motorCarrierId,
      },

              // event type 5
      {
        'event_sequence_id_number': 1,
        'event_type': 5,
        'event_code': 1,
        'event_timestamp': today.setMinutes(today.getMinutes() + 2),
        'shipping_doc_number': 'AAEECC1234',
        'event_record_status': 1,
        'accumulated_vehicle_miles': 0,
        'elapsed_engine_hours': 0,
        'coordinates': {
          'lat': 40.32,
          'lng': -70.65,
        },
        'distance_since_last_valid_coordinates': 4,
        'malfunction_indicator_status': false,
        'data_diagnostic_event_indicator_status_for_driver': false,
        'event_data_check_value': 0,
        'annotation': 'evento prueba tipo 1',
        'driver_location_description': 'Avenida Las Condes 324',
        'total_vehicle_miles': 100,
        'total_engine_hours': 3.5,
        'time_zone_offset_utc': 4,
        'date_of_certified_record': '2018-04-21T23:30:20.660Z',
        'event_report_status': true,
        'certified': false,
        'driverId': people[2].id,
        'vehicleId': vehicles[0].id,
        'motorCarrierId': vehicles[0].motorCarrierId,
      },
          // event type 1
      {
        'event_sequence_id_number': 2,
        'event_type': 1,
        'event_code': 3,
        'event_timestamp': today.setMinutes(today.getMinutes() + 2),
        'shipping_doc_number': 'AAEECC1234',
        'event_record_status': 1,
        'accumulated_vehicle_miles': 0,
        'elapsed_engine_hours': 0,
        'coordinates': {
          'lat': 40.32,
          'lng': -70.65,
        },
        'distance_since_last_valid_coordinates': 4,
        'malfunction_indicator_status': false,
        'data_diagnostic_event_indicator_status_for_driver': false,
        'event_data_check_value': 0,
        'annotation': 'evento prueba tipo 1',
        'driver_location_description': 'Avenida Las Condes 324',
        'total_vehicle_miles': 100,
        'total_engine_hours': 3.5,
        'time_zone_offset_utc': 4,
        'date_of_certified_record': '2018-04-21T23:30:20.660Z',
        'event_report_status': true,
        'certified': false,
        'driverId': people[2].id,
        'vehicleId': vehicles[0].id,
        'motorCarrierId': vehicles[0].motorCarrierId,
      },
          // event type 2

      {
        'event_sequence_id_number': 3,
        'event_type': 2,
        'event_code': 1,
        'event_timestamp': today.setHours(today.getHours() + 1),
        'shipping_doc_number': 'AAEECC1234',
        'event_record_status': 1,
        'accumulated_vehicle_miles': 50,
        'elapsed_engine_hours': 1,
        'coordinates': {
          'lat': 42.32,
          'lng': -71.65,
        },
        'distance_since_last_valid_coordinates': 2,
        'malfunction_indicator_status': false,
        'data_diagnostic_event_indicator_status_for_driver': false,
        'event_data_check_value': 0,
        'annotation': 'evento prueba tipo 1',
        'driver_location_description': 'Avenida Las Condes 324',
        'total_vehicle_miles': 150,
        'total_engine_hours': 4.5,
        'time_zone_offset_utc': 4,
        'date_of_certified_record': '2018-04-22T00:30:20.660Z',
        'event_report_status': true,
        'certified': false,
        'driverId': people[2].id,
        'vehicleId': vehicles[0].id,
        'motorCarrierId': vehicles[0].motorCarrierId,
      },

          // event type 3
      {
        'event_sequence_id_number': 4,
        'event_type': 3,
        'event_code': 1,
        'event_timestamp': today.setHours(today.getHours() + 1),
        'shipping_doc_number': 'AAEECC1234',
        'event_record_status': 1,
        'accumulated_vehicle_miles': 100,
        'elapsed_engine_hours': 2,
        'coordinates': {
          'lat': 43.32,
          'lng': -71.85,
        },
        'distance_since_last_valid_coordinates': 2,
        'malfunction_indicator_status': false,
        'data_diagnostic_event_indicator_status_for_driver': false,
        'event_data_check_value': 0,
        'annotation': 'evento prueba tipo 1',
        'driver_location_description': 'Avenida Las Condes 324',
        'total_vehicle_miles': 200,
        'total_engine_hours': 5.5,
        'time_zone_offset_utc': 4,
        'date_of_certified_record': '2018-04-21T23:30:20.660Z',
        'event_report_status': true,
        'certified': false,
        'driverId': people[2].id,
        'vehicleId': vehicles[0].id,
        'motorCarrierId': vehicles[0].motorCarrierId,
      },
          // event type 4
      {
        'event_sequence_id_number': 5,
        'event_type': 4,
        'event_code': 1,
        'event_timestamp': today,
        'shipping_doc_number': 'AAEECC1234',
        'event_record_status': 1,
        'accumulated_vehicle_miles': 100,
        'elapsed_engine_hours': 2,
        'coordinates': {
          'lat': 43.32,
          'lng': -71.85,
        },
        'distance_since_last_valid_coordinates': 0,
        'malfunction_indicator_status': false,
        'data_diagnostic_event_indicator_status_for_driver': false,
        'event_data_check_value': 0,
        'annotation': 'evento prueba tipo 1',
        'driver_location_description': 'Avenida Las Condes 324',
        'total_vehicle_miles': 200,
        'total_engine_hours': 5.5,
        'time_zone_offset_utc': 4,
        'date_of_certified_record': '2018-04-21T23:30:20.660Z',
        'event_report_status': true,
        'certified': false,
        'driverId': people[2].id,
        'vehicleId': vehicles[0].id,
        'motorCarrierId': vehicles[0].motorCarrierId,
      },
          // event type 7
      {
        'event_sequence_id_number': 6,
        'event_type': 7,
        'event_code': 1,
        'event_timestamp': today,
        'shipping_doc_number': 'AAEECC1234',
        'event_record_status': 1,
        'accumulated_vehicle_miles': 100,
        'elapsed_engine_hours': 2,
        'coordinates': {
          'lat': 43.32,
          'lng': -71.85,
        },
        'distance_since_last_valid_coordinates': 0,
        'malfunction_indicator_status': true,
        'data_diagnostic_event_indicator_status_for_driver': false,
        'event_data_check_value': 0,
        'annotation': 'evento prueba tipo 1',
        'driver_location_description': 'Avenida Las Condes 324',
        'total_vehicle_miles': 200,
        'total_engine_hours': 5.5,
        'time_zone_offset_utc': 4,
        'date_of_certified_record': '2018-04-21T23:30:20.660Z',
        'event_report_status': true,
        'certified': false,
        'driverId': people[2].id,
        'vehicleId': vehicles[0].id,
        'motorCarrierId': vehicles[0].motorCarrierId,
      },

    ];

    /*
    var event = await Event.create(data, function(err) {
      if (err) throw err;
    });
    */
    var event = await Event.create(data);
    console.log('events created!');
    return event;
  }

  async function createRoles(users, cb) {
    await postgresDs.automigrate('Role');
    await postgresDs.automigrate('RoleMapping');
        // create the admin role
    var roles = await Role.create([{
      name: 'A',
    },
    {
      name: 'S',
    },
    {
      name: 'D',
    }]);

    console.log('Roles created');

    return roles;
  }

  function fakeDrivers(num, cb) {
    var Person = app.models.Person;
    var data = [];

    for (var i = 0; i < 20; i++) {
      var name = faker.name.firstName();
      var lastname = faker.name.lastName();
      var driver = {
        'first_name': name,
        'last_name': lastname,
        'email': name + '.' + lastname + '@gmail.com',
        'account_type': 'D',
        'username': name + lastname + faker.random.number(),
        'emailVerified': true,
        'password': '1234',
        'driver_license_number': faker.random.number(),
        'licenses_issuing_state': faker.address.state(),
        'account_status': true,
        'exempt_driver_configuration': 'E',
        'time_zone_offset_utc': randomInt(4, 11), // entre 4 y 11
        'starting_time_24_hour_period': Date.now(),
        'move_yards_use': true,
        'default_use': true,
        'personal_use': true,
        'motorCarrierId': 1,
      };
      data.push(driver);
    }

    Person.create(data, function(err) {
      if (err) throw err;
      console.log('Drivers created succesfully');
    });

    cb(null);
  }

  function fakeVehicles(num, cb) {
    var Vehicle = app.models.Vehicle;
    var data = [];
    var models = ['Truck', 'Bus', 'Car'];
    var companies = ['BMW', 'Mercedez', 'Chevrolet', 'Toyota', 'Mahindra'];

    for (var i = 0; i < num; i++) {
      var plaque = '';
      var vin = '';
      for (var j = 0; j < 18; j++) {
        if (j < 6) {
          plaque += faker.random.alphaNumeric();
        }
        vin += faker.random.alphaNumeric();
      }
      var driver = {
        'vin': vin,
        'CMV_power_unit_number': randomInt(1, 999999999),
        'model': randomChoice(models),
        'car_maker': randomChoice(companies),
        'plaque': plaque,
        'state': faker.address.state(),
        'IMEI_ELD': faker.random.number(),
        'motorCarrierId': 1,
      };
      data.push(driver);
    }

    Vehicle.create(data, function(err) {
      if (err) throw err;
      console.log('More vehicles created succesfully');
    });

    cb(null);
  }

  function fakeEvents(num, cb) {
    var Event = app.models.Event;
    var data = [];
    var drivers = app.models.Person.find({where: {account_type: 'D',
      motorCarrierId: 1}}, function(err, drivers) {
      if (err) throw err;
      return drivers;
    });
    var vehicles = app.models.Vehicle.find({where: {motorCarrierId: 1}},
      function(err, vehicles) {
        if (err) throw err;
        return vehicles;
      });

    for (var i = 0; i < num; i++) {
      var event = {
        'event_sequence_id_number': 0,
        'event_type': 6,
        'event_code': 1,
        'event_timestamp': today.setMinutes(today.getMinutes() + 0),
        'shipping_doc_number': 'AAEECC1234',
        'event_record_status': 1,
        'accumulated_vehicle_miles': 0,
        'elapsed_engine_hours': 0,
        'coordinates': {
          'lat': faker.address.latitude,
          'lng': faker.address.longitude,
        },
        'distance_since_last_valid_coordinates': 4,
        'malfunction_indicator_status': false,
        'data_diagnostic_event_indicator_status_for_driver': false,
        'event_data_check_value': 0,
        'annotation': 'evento prueba tipo 1',
        'driver_location_description': 'Avenida Las Condes 324',
        'total_vehicle_miles': 100,
        'total_engine_hours': 3.5,
        'time_zone_offset_utc': 4,
        'date_of_certified_record': '2018-04-21T23:30:20.660Z',
        'event_report_status': faker.random.boolean(),
        'certified': faker.random.boolean(),
        'driverId': driver.id,
        'vehicleId': vehicle.id,
        'motorCarrierId': 1,
      };
      data.push(event);
    }

    console.log(data);

    Event.create(data, function(err) {
      if (err) throw err;
      console.log('More vehicles created succesfully');
    });

    cb(null);
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
  }

  function randomChoice(array) {
    var index = Math.floor(Math.random() * array.length);
    return array[index];
  }
};
