'use strict';
var FormData = require('form-data');
var fs = require('fs');
var faker = require('faker');
var loopback = require('loopback');
var GeoPoint = loopback.GeoPoint;

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

  fakeDrivers(30, function(err, drivers) {
    if (err) throw err;
    fakeVehicles(30, function(err, vehicles) {
      if (err) throw err;
      fakeEvents(100, drivers, vehicles, function(err, events) {
        if (err) throw err;
        console.log('Drivers, vehicles, devices, events created ok');
        fakeTrackings(100, drivers, vehicles, events, function(err, trackings) {
          if (err) throw err;
          console.log('Trackings created');
          console.log('Database seeded');
        });
      });
    });
  }
  );

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

  async function fakeDrivers(num, cb) {

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
        'starting_time_24_hour_period': faker.date.past(),
        'move_yards_use': true,
        'default_use': true,
        'personal_use': true,
        'motorCarrierId': 1,
      };
      data.push(driver);
    }

    Person.create(data, function(err, driv) {
      if (err) throw err;
      console.log('Drivers created succesfully');
      cb(null, driv);
    });
  }

  async function fakeVehicles(num, cb) {
    await postgresDs.automigrate('Vehicle');
    await postgresDs.automigrate('Device');
    var Vehicle = app.models.Vehicle;
    var Device = app.models.Device;
    var dataVehicle = [];
    var dataDevice = [];
    var models = ['Truck', 'Bus', 'Car'];
    var companies = ['BMW', 'Mercedez', 'Chevrolet', 'Toyota', 'Mahindra'];

    for (var i = 0; i < num; i++) {
      var plaque = '';
      var vin = '';
      var imei = faker.random.number();
      for (var j = 0; j < 18; j++) {
        if (j < 6) {
          plaque += faker.random.alphaNumeric();
        }
        vin += faker.random.alphaNumeric();
      }
      var vehicle = {
        'vin': vin,
        'CMV_power_unit_number': randomInt(1, 999999999),
        'model': randomChoice(models),
        'car_maker': randomChoice(companies),
        'plaque': plaque,
        'state': faker.address.state(),
        'IMEI_ELD': imei,
        'motorCarrierId': 1,
      };
      var device = {
        'bluetooth_mac': 'A1EC3E5FF45',
        'imei': imei,
        'state': true,
        'configuration_script': 'AAAAAAA',
        'configuration_status': true,
      };
      dataVehicle.push(vehicle);
      dataDevice.push(device);
    }

    Vehicle.create(dataVehicle, function(err, veh) {
      if (err) throw err;
      Device.create(dataDevice, function(err, devices) {
        if (err) throw err;
        devices.forEach(function(dev) {
          var car = veh.filter(function(elem) {
            return elem.IMEI_ELD == dev.imei;
          });
          dev.vehicleId = car[0].id;
          dev.save(function(err) {
            if (err) throw err;
          });
        });
        console.log('Devices created succesfully');
      });
      cb(null, veh);
    });
  }

  async function fakeEvents(num, driv, veh, cb) {
    await postgresDs.automigrate('Event');
    var Event = app.models.Event;
    var data = [];

    let eventTypes = [1, 2, 3, 4, 5, 6, 7];
    let dict = {
      1: {
        min: 1,
        max: 4,
      },
      2: {
        min: 1,
        max: 2,
      },
      3: {
        min: 0,
        max: 2,
      },
      4: {
        min: 1,
        max: 9,
      },
      5: {
        min: 1,
        max: 2,
      },
      6: {
        min: 1,
        max: 4,
      },
      7: {
        min: 1,
        max: 4,
      },
    };

    var drivers = driv.filter(function(elem) {
      return elem.account_type === 'D' && elem.motorCarrierId === 1;
    });
    var vehicles = veh.filter(function(elem) {
      return elem.motorCarrierId === 1;
    });

    for (var i = 0; i < num; i++) {
      var driver = randomChoice(drivers);
      var vehicle = randomChoice(vehicles);
      var type = randomChoice(eventTypes);
      var code = randomInt(dict[type].min, dict[type].max);

      var event = {
        'event_sequence_id_number': randomInt(0, num),
        'event_type': type,
        'event_code': code,
        'event_timestamp': faker.date.past(),
        'shipping_doc_number': 'AAEECC1234',
        'event_record_status': 1,
        'accumulated_vehicle_miles': 0,
        'elapsed_engine_hours': 0,
        'coordinates': {
          'lat': faker.address.latitude(),
          'lng': faker.address.longitude(),
        },
        'distance_since_last_valid_coordinates': 4,
        'malfunction_indicator_status': faker.random.boolean(),
        'data_diagnostic_event_indicator_status_for_driver':
        faker.random.boolean(),
        'event_data_check_value': 0,
        'annotation': faker.lorem.words(),
        'driver_location_description': faker.address.streetAddress(),
        'total_vehicle_miles': 100,
        'total_engine_hours': 3.5,
        'time_zone_offset_utc': randomInt(4, 11),
        'date_of_certified_record': faker.date.future(),
        'event_report_status': faker.random.boolean(),
        'certified': faker.random.boolean(),
        'driverId': driver.id,
        'vehicleId': vehicle.id,
        'motorCarrierId': 1,
      };
      data.push(event);
    }

    Event.create(data, function(err, events) {
      if (err) {
        console.log('Error creating events');
        console.log(err);
        throw err;
      };
      console.log('More events created succesfully');
      cb(null, events);
    });
  }

  async function fakeTrackings(num, drivers, vehicles, events, cb) {
    await postgresDs.automigrate('Tracking');
    var data = [];
    var Tracking = app.models.Tracking;
    for (var i = 0; i < num; i++) {
      var driver = randomChoice(drivers);
      var vehicle = randomChoice(vehicles);
      var track = {
        'coordinates':
        GeoPoint({lat: randomInt(-90, 90), lng: randomInt(-180, 180)}),
        'speed': randomInt(0, 100),
        'timestamp': Date.now(),
        'speed_limit_exceeded': faker.random.boolean(),
        'drive_time_exceeded': faker.random.boolean(),
        'personId': driver.id,
        'vehicleId': vehicle.id,
      };
      data.push(track);
    };
    Tracking.create(data, function(err, trackings) {
      if (err) throw err;
      cb(null, trackings);
    });
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
  }

  function randomChoice(array) {
    var index = Math.floor(Math.random() * array.length);
    return array[index];
  }
};
