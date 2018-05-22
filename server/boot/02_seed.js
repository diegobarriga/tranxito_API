'use strict';
var FormData = require('form-data');
var fs = require('fs');
var faker = require('faker');
var loopback = require('loopback');
var GeoPoint = loopback.GeoPoint;
var IMEI_GenCheck = require('imei_gencheck');
const imeigc = new IMEI_GenCheck();
var randomMac = require('random-mac');

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

  fakeDrivers(50, function(err, drivers) {
    if (err) throw err;
    fakeVehicles(30, function(err, vehicles) {
      if (err) throw err;
      Simulate(drivers, vehicles, function(err) {
        if (err) throw err;
        console.log('Database seeded');
      });
    //   fakeEvents(100, drivers, vehicles, function(err, events) {
    //     if (err) throw err;
    //     console.log('Drivers, vehicles, devices, events created ok');
    //     fakeTrackings(drivers, vehicles, events, function(err, trackings) {
    //       if (err) throw err;
    //       console.log('Trackings created');
    //       console.log('Database seeded');
    //     });
    //   });
    });
  });

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
        'motorCarrierId': randomInt(1, 2),
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
      var imei = imeigc.randomIMEI_fullRandom();

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
        'IMEI_ELD': Number(imei),
        'motorCarrierId': randomInt(1, 2),
      };
      var device = {
        'bluetooth_mac': randomMac(),
        'imei': Number(imei),
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

  // Simulate events and trackings
  async function Simulate(drivers, vehicles, cb) {
    await postgresDs.automigrate('Tracking');
    await postgresDs.automigrate('Event');
    var Event = app.models.Event;
    var Tracking = app.models.Tracking;
    var dateStart = new Date(Date.now());
    dateStart.setMonth(dateStart.getMonth() - 1);
    var dataEvents, dataTrackings, x, y, counter, latitude, longitude;
    // 30 day simulation
    for (var i = 0; i < 30; i++) {
      vehicles.forEach(function(element) {
        var driver = randomChoice(drivers);
        var today = new Date(dateStart);
        counter = 0;
        latitude = randomInt(25, 49);
        longitude = randomInt(-124, -66);
        dataEvents = [];
        dataTrackings = [];
        // 600 minutes driving periods
        // tracking every 3 minutes
        for (var i = 0; i < 200; i++) {
          x = randomInt(-10, 10);
          y = randomInt(-10, 10);
          latitude = (25 < latitude + x && latitude + x < 49) ?
          latitude + x : latitude;
          longitude = (-124 < longitude + y && longitude + y < -66) ?
          longitude + y : longitude;
          if (i % 20 == 0) { // every hour duty status changes
            var event = changeDutyStatusEvent(driver, element,
             counter, new Date(today), latitude, longitude);
            counter += 1;
            dataEvents.push(event);
          }
          if (i != 0) {
            today.setMinutes(today.getMinutes() + 3);
            var tracking = fakeTrack(driver, element, new Date(today),
             latitude, longitude, i);
            dataTrackings.push(tracking);
          }
        }
        Event.create(dataEvents, function(err) {
          if (err) {
            cb(err);
          }
        });
        Tracking.create(dataTrackings, function(err) {
          if (err) {
            cb(err);
          }
        });
      });
      dateStart.setDate(dateStart.getDate() + 1);
    }
    cb(null);
  }

  function fakeTrack(driver, car, today, lat, lng, minutes) {
    var speed = randomInt(0, 100);
    var track = {
      'coordinates': GeoPoint({lat: lat, lng: lng}),
      'speed': speed,
      'timestamp': today,
      'speed_limit_exceeded': (speed > 60), // if speed is greater than 60 limit is exceeded
      'drive_time_exceeded': (minutes % 100 == 0 && minutes != 0), // drive time exceeded every 100 minutes
      'personId': driver.id,
      'vehicleId': car.id,
    };
    return track;
  }

  // async function fakeTrackings(num, drivers, vehicles, events, cb) {
  //   await postgresDs.automigrate('Tracking');
  //   var data = [];
  //   var Tracking = app.models.Tracking;
  //   for (var i = 0; i < num; i++) {
  //     var driver = randomChoice(drivers);
  //     var vehicle = randomChoice(vehicles);
  //     var track = {
  //       'coordinates':
  //       GeoPoint({lat: randomInt(-90, 90), lng: randomInt(-180, 180)}),
  //       'speed': randomInt(0, 100),
  //       'timestamp': Date.now(),
  //       'speed_limit_exceeded': faker.random.boolean(),
  //       'drive_time_exceeded': faker.random.boolean(),
  //       'personId': driver.id,
  //       'vehicleId': vehicle.id,
  //     };
  //     data.push(track);
  //   };
  //   Tracking.create(data, function(err, trackings) {
  //     if (err) throw err;
  //     cb(null, trackings);
  //   });
  // }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  function randomChoice(array) {
    var index = Math.floor(Math.random() * array.length);
    return array[index];
  }

  function changeDutyStatusEvent(driver, vehicle, sequence, today, lat, lng) {
    var accumulatedMiles = randomInt(0, 7000);
    var elapsedHours = randomInt(0, 50);
    var event = {
      'event_sequence_id_number': sequence,
      'event_type': 1,
      'event_code': randomInt(1, 4),
      'event_timestamp': today,
      'shipping_doc_number': 'AAEECC1234',
      'event_record_status': randomInt(1, 4),
      'accumulated_vehicle_miles': accumulatedMiles,
      'elapsed_engine_hours': elapsedHours,
      'coordinates': {
        'lat': lat,
        'lng': lng,
      },
      'distance_since_last_valid_coordinates': randomInt(0, 6),
      'malfunction_indicator_status': faker.random.boolean(),
      'data_diagnostic_event_indicator_status_for_driver':
      faker.random.boolean(),
      'event_data_check_value': 0,
      'annotation': faker.lorem.words(),
      'driver_location_description': faker.address.streetAddress(),
      'total_vehicle_miles': randomInt(accumulatedMiles, 9999000),
      'total_engine_hours': randomInt(elapsedHours, 99000),
      'time_zone_offset_utc': randomInt(4, 11),
      'date_of_certified_record': faker.date.future(),
      'event_report_status': faker.random.boolean(),
      'certified': faker.random.boolean(),
      'driverId': driver.id,
      'vehicleId': vehicle.id,
      'motorCarrierId': driver.motorCarrierId,
    };
    return event;
  }
};
