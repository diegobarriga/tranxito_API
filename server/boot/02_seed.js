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
        'IMEI_ELD': imei,
        'motorCarrierId': randomChoice([1, 2]),
      };
      var device = {
        'bluetooth_mac': randomMac(),
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

  // async function fakeEvents(num, driv, veh, cb) {
  //   await postgresDs.automigrate('Event');
  //   var Event = app.models.Event;
  //   var data = [];

  //   let eventTypes = [1, 2, 3, 4, 5, 6, 7];
  //   let dict = {
  //     1: {
  //       min: 1,
  //       max: 4,
  //     },
  //     2: {
  //       min: 1,
  //       max: 2,
  //     },
  //     3: {
  //       min: 0,
  //       max: 2,
  //     },
  //     4: {
  //       min: 1,
  //       max: 9,
  //     },
  //     5: {
  //       min: 1,
  //       max: 2,
  //     },
  //     6: {
  //       min: 1,
  //       max: 4,
  //     },
  //     7: {
  //       min: 1,
  //       max: 4,
  //     },
  //   };

  //   var drivers = driv.filter(function(elem) {
  //     return elem.account_type === 'D' && elem.motorCarrierId === 1;
  //   });
  //   var vehicles = veh.filter(function(elem) {
  //     return elem.motorCarrierId === 1;
  //   });

  //   for (var i = 0; i < num; i++) {
  //     var driver = randomChoice(drivers);
  //     var vehicle = randomChoice(vehicles);
  //     var type = randomChoice(eventTypes);
  //     var code = randomInt(dict[type].min, dict[type].max);
  //     var accumulatedMiles = randomInt(0, 7000);
  //     var elapsedHours = randomInt(0, 50);

  //     var event = {
  //       'event_sequence_id_number': randomInt(0, num),
  //       'event_type': type,
  //       'event_code': code,
  //       'event_timestamp': faker.date.past(),
  //       'shipping_doc_number': 'AAEECC1234',
  //       'event_record_status': randomInt(1, 4),
  //       'accumulated_vehicle_miles': accumulatedMiles,
  //       'elapsed_engine_hours': elapsedHours,
  //       'coordinates': {
  //         'lat': faker.address.latitude(),
  //         'lng': faker.address.longitude(),
  //       },
  //       'distance_since_last_valid_coordinates': randomInt(0, 6),
  //       'malfunction_indicator_status': faker.random.boolean(),
  //       'data_diagnostic_event_indicator_status_for_driver':
  //       faker.random.boolean(),
  //       'event_data_check_value': 0,
  //       'annotation': faker.lorem.words(),
  //       'driver_location_description': faker.address.streetAddress(),
  //       'total_vehicle_miles': randomInt(accumulatedMiles, 9999000),
  //       'total_engine_hours': randomInt(elapsedHours, 99000),
  //       'time_zone_offset_utc': randomInt(4, 11),
  //       'date_of_certified_record': faker.date.future(),
  //       'event_report_status': faker.random.boolean(),
  //       'certified': faker.random.boolean(),
  //       'driverId': driver.id,
  //       'vehicleId': vehicle.id,
  //       'motorCarrierId': driver.motorCarrierId,
  //     };
  //     data.push(event);
  //   }

  //   Event.create(data, function(err, events) {
  //     if (err) {
  //       console.log('Error creating events');
  //       console.log(err);
  //       throw err;
  //     };
  //     console.log('More events created succesfully');
  //     cb(null, events);
  //   });
  // }

  // async function fakeTrackings(drivers, vehicles, events, cb) {
  //   await postgresDs.automigrate('Tracking');
  //   var data = [];
  //   var Tracking = app.models.Tracking;

  //   vehicles.forEach(function(car) {
  //     var driver = randomChoice(drivers);
  //     var latitude = randomInt(25, 49);
  //     var longitude = randomInt(-124, -66);
  //     var dateStart = new Date(Date.now());
  //     var speed, x, y;
  //     dateStart.setMonth(dateStart.getMonth() - 1);
  //     for (var i = 0; i < 40; i++) {
  //       dateStart.setMinutes(dateStart.getMinutes() + 10);
  //       x = randomInt(-10, 10);
  //       y = randomInt(-10, 10);
  //       latitude = (25 < latitude + x && latitude + x < 49) ?
  //       latitude + x : latitude;
  //       longitude = (-124 < longitude + y && longitude + y < -66) ?
  //       longitude + y : longitude;
  //       speed = randomInt(0, 100);
  //       var track = {
  //         'coordinates':
  //         GeoPoint({lat: latitude,
  //           lng: longitude}),
  //         'speed': speed,
  //         'timestamp': dateStart,
  //         'speed_limit_exceeded': (speed > 60), // if speed is greater than 60 limit is exceeded
  //         'drive_time_exceeded': (i % 700 == 0 && i != 0), // drive time exceeded every 700 minutes
  //         'personId': driver.id,
  //         'vehicleId': car.id,
  //       };
  //       data.push(track);
  //     }
  //   });

  //   Tracking.create(data, function(err, trackings) {
  //     if (err) throw err;
  //     cb(null, trackings);
  //   });
  // }

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
      var accumulated_vehicle_miles = randomInt(0, 9999);
      var elapsed_engine_hours = randomInt(0, 99)

      var event = {
        'event_sequence_id_number': randomInt(0, num),
        'event_type': type,
        'event_code': code,
        'event_timestamp': faker.date.past(),
        'shipping_doc_number': 'AAEECC1234',
        'event_record_status': randomInt(1, 4),
        'accumulated_vehicle_miles': accumulated_vehicle_miles,
        'elapsed_engine_hours': elapsed_engine_hours,
        'coordinates': {
          'lat': faker.address.latitude(),
          'lng': faker.address.longitude(),
        },
        'distance_since_last_valid_coordinates': randomInt(0, 6),
        'malfunction_indicator_status': faker.random.boolean(),
        'data_diagnostic_event_indicator_status_for_driver':
        faker.random.boolean(),
        'event_data_check_value': 0,
        'annotation': faker.lorem.words(),
        'driver_location_description': faker.address.streetAddress(),
        'total_vehicle_miles': randomInt(accumulated_vehicle_miles, 9999999),
        'total_engine_hours': randomInt(elapsed_engine_hours, 99999),
        'time_zone_offset_utc': randomInt(4, 11),
        'date_of_certified_record': faker.date.future(),
        'event_report_status': faker.random.boolean(),
        'certified': faker.random.boolean(),
        'driverId': driver.id,
        'vehicleId': vehicle.id,
        'motorCarrierId': vehicle.motorCarrierId,
      };
      data.push(event);
    }

  function randomChoice(array) {
    var index = Math.floor(Math.random() * array.length);
    return array[index];
  }

  // Simulate events and trackings
  async function Simulate(drivers, vehicles, cb) {
    await postgresDs.automigrate('Tracking');
    await postgresDs.automigrate('Event');
    var Event = app.models.Event;
    var Tracking = app.models.Tracking;
    var dateStart = new Date(Date.now());
    dateStart.setMonth(dateStart.getMonth() - 1);
    var dataEvents = [];
    var dataTrackings = [];
    // 30 day simulation
    for (var i = 0; i < 30; i++) {
      vehicles.forEach(function(element) {
        var driver = randomChoice(drivers);
        var today = new Date(dateStart);
        var counter = 0;
        var x, y;
        var latitude = randomInt(25, 49);
        var longitude = randomInt(-124, -66);
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
      });
      dateStart.setDate(dateStart.getDate() + 1);
    }
    Event.create(dataEvents, function(err) {
      if (err) {
        cb(err);
      } else {
        console.log('Events simulated');
        Tracking.create(dataTrackings, function(err) {
          if (err) {
            cb(err);
          } else {
            console.log('Trackings simulated');
            cb(null);
          }
        });
      }
    });
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
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
