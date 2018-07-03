'use strict';
var FormData = require('form-data');
var fs = require('fs');
var faker = require('faker');
var loopback = require('loopback');
var GeoPoint = loopback.GeoPoint;
var ImeiGenCheck = require('imei_gencheck');
const imeigc = new ImeiGenCheck();
var randomMac = require('random-mac');
const TrackingTime = 30; // every TrackingTime minutes generate a new tracking
const EventTime = 30; // every EventTime hours generate a new DutyStatusEvent
const DailyHours = 2; // daily hours for simulation
// trackings = DailyHours*60/TrackingTime
// events = DailyHours*60/EventTime

process.on('unhandledRejection', r => console.log(r));

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

  await roles
  .then(function(res) {
    return res;
  }).catch(err => { throw err; });

  var carriers = createCarriers(function(err) {
    if (err) throw err;
    console.log('> motor carriers created sucessfully');
  });
  carriers = await carriers.then(function(res) {
    return res;
  }).catch(err => { throw err; });

  var people = createPeople(carriers, function(err) {
    if (err) throw err;
    console.log('> people created sucessfully');
  });
  people = await people.then(function(res) {
    return res;
  }).catch(err => { throw err; });

  var trailers = fakeTrailers(30, function(err, vehicles) {
    if (err) throw err;
    console.log('> Trailers created sucessfully');
  });

  trailers = await trailers.then(function(res) {
    return res;
  }).catch(err => { throw err; });

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

    let Carrier = app.models.MotorCarrier;
    let motorCarriers = [];
    let carrier;
    carrier = await Carrier.create(
      {'name': 'E2EGroup', 'usdotNumber': 0, 'multidayBasisUsed': 7,
        'createDevices': true});
    motorCarriers.push(carrier);
    carrier = await Carrier.create(
      {'name': 'DCCGroup', 'usdotNumber': 12, 'multidayBasisUsed': 8,
        'createDevices': false});
    motorCarriers.push(carrier);

    console.log(`motor carrier created! ${JSON.stringify(motorCarriers)}`);
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
        'firstName': 'Andres', 'lastName': 'Flores',
        'email': 'aflores@gmail.com', 'accountType': 'A',
        'username': 'aflores', 'emailVerified': true,
        'password': '1234', 'accountStatus': true,
      },
      {
        'firstName': 'Fernando', 'lastName': 'Diaz',
        'email': 'fdiaz@gmail.com', 'accountType': 'S',
        'username': 'fdiaz', 'emailVerified': true,
        'motorCarrierId': carriers[0].id, 'password': '1234',
        'accountStatus': true,
      },
      {
        'firstName': 'Pablo', 'lastName': 'Sanchez',
        'email': 'pablo.sanchez@gmail.com', 'accountType': 'D',
        'username': 'pablo.sanchez', 'emailVerified': true,
        'motorCarrierId': carriers[0].id, 'password': '1234',
        'driverLicenseNumber': '10234502',
        'licenseIssuingState': 'Santiago',
        'accountStatus': true, 'exemptDriverConfiguration': 'E',
        'timeZoneOffsetUtc': 5, 'startingTime24HourPeriod': Date.now(),
        'moveYardsUse': true, 'defaultUse': true, 'personalUse': true,

      },
      {
        'firstName': 'Andrea', 'lastName': 'Fernandez',
        'email': 'afdez@gmail.com', 'accountType': 'A',
        'username': 'afdez', 'emailVerified': true,
        'password': '1234', 'accountStatus': true,
      },
      {
        'firstName': 'Bernardo', 'lastName': 'Perez',
        'email': 'bperez@gmail.com', 'accountType': 'S',
        'username': 'bperez', 'emailVerified': true,
        'motorCarrierId': carriers[1].id, 'password': '1234',
        'accountStatus': true,
      },
      {
        'firstName': 'Pedro', 'lastName': 'Lopez',
        'email': 'pedro.lopez@gmail.com', 'accountType': 'D',
        'username': 'pedro.lopez', 'emailVerified': true,
        'motorCarrierId': carriers[1].id, 'password': '1234',
        'driverLicenseNumber': '10255321',
        'licenseIssuingState': 'Santiago',
        'accountStatus': true, 'exemptDriverConfiguration': 'E',
        'timeZoneOffsetUtc': 4, 'startingTime24HourPeriod': Date.now(),
        'moveYardsUse': false, 'defaultUse': true, 'personalUse': false,
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
    let Person = app.models.Person;
    var data = [];
    let images = [
      'personDefault1.jpeg',
      'personDefault2.jpeg',
      'personDefault3.jpeg',
      'personDefault4.jpeg',
      'personDefault5.jpeg',
    ];

    for (var i = 0; i < 20; i++) {
      let name = faker.name.firstName();
      let lastname = faker.name.lastName();
      let driver = {
        'firstName': name,
        'lastName': lastname,
        'email': name + '.' + lastname + '@gmail.com',
        'accountType': 'D',
        'username': name + lastname + faker.random.number(),
        'emailVerified': true,
        'password': '1234',
        'driverLicenseNumber': faker.random.number(),
        'licenseIssuingState': faker.address.state(),
        'accountStatus': true,
        'exemptDriverConfiguration': 'E',
        'timeZoneOffsetUtc': randomInt(4, 11), // entre 4 y 11
        'startingTime24HourPeriod': faker.date.past(),
        'moveYardsUse': true,
        'defaultUse': true,
        'personalUse': true,
        'motorCarrierId': randomInt(1, 2),
        'image': randomChoice(images),
      };
      data.push(driver);
    }

    Person.create(data, function(err, driv) {
      if (err) throw err;
      console.log('Drivers created succesfully');
      cb(null, driv);
    });
  }

  async function fakeTrailers(num, cb) {
    await postgresDs.automigrate('Trailer');
    let Trailer = app.models.Trailer;
    let dataTrailer = [];
    let images = [
      'container.jpeg',
      'refrigerated.jpg',
      'dry_trailer.jpg',
      'liquid_tank.jpg',
      'pneumatic.jpg',
    ];
    let trailerCompanies = ['Hyundai Translead', 'Doepker', 'East',
      'Felling Trailers', 'Fontaine', 'Mac'];
    let trailerModels = ['Container', 'Refrigerated Van', 'Dry Van',
      'Liquid Tank', 'Pneumatic Tank'];
    for (var i = 0; i < num; i++) {
      let model = randomInt(0, 4);
      let vinTrailer = '';
      let motorCarrierId = i % 2 === 0 ? 2 : 1;
      let today = new Date();
      let thisYear = today.getUTCFullYear();
      for (var j = 0; j < 18; j++) {
        vinTrailer += faker.random.alphaNumeric();
      }
      let trailer = {
        'manufacturer': randomChoice(trailerCompanies),
        'model': trailerModels[model],
        'number': vinTrailer.substr(0, 10),
        'vin': vinTrailer,
        'year': thisYear - randomInt(-1, 75),
        'gvw': randomInt(500, 2000),
        'motorCarrierId': motorCarrierId,
        'image': images[model],
      };
      dataTrailer.push(trailer);
    }
    Trailer.create(dataTrailer, function(err, trailers) {
      if (err) throw err;
      cb(null, trailers);
    });
  }

  async function fakeVehicles(num, cb) {
    await postgresDs.automigrate('Vehicle');
    await postgresDs.automigrate('Device');
    let Vehicle = app.models.Vehicle;
    let Device = app.models.Device;
    let dataVehicle = [];
    let dataDevice = [];
    let models = ['Truck', 'Bus', 'Car'];
    let companies = ['BMW', 'Mercedez', 'Chevrolet', 'Toyota', 'Mahindra'];
    let images = [
      'vehicleDefault1.jpeg',
      'vehicleDefault2.jpeg',
      'vehicleDefault3.jpeg',
      'vehicleDefault4.jpeg',
      'vehicleDefault5.jpeg',
      'vehicleDefault6.jpeg',
    ];

    for (var i = 0; i < num; i++) {
      let plaque = '';
      let vin = '';
      let motorCarrierId = randomInt(1, 2);
      let imei = imeigc.randomIMEI_fullRandom();

      for (var j = 0; j < 18; j++) {
        if (j < 6) {
          plaque += faker.random.alphaNumeric();
        }
        vin += faker.random.alphaNumeric();
      }
      let vehicle = {
        'vin': vin,
        'CmvPowerUnitNumber': randomInt(1, 999999999),
        'model': randomChoice(models),
        'carMaker': randomChoice(companies),
        'plaque': plaque,
        'state': faker.address.state(),
        'motorCarrierId': motorCarrierId,
        'image': randomChoice(images),
      };
      let device = {
        'bluetoothMac': randomMac(),
        'imei': Number(imei),
        'state': true,
        'configScript': '#--string script--',
        'configStatus': true,
        'sequenceId': randomInt(0, 65535),
        'motorCarrierId': motorCarrierId,
      };
      dataVehicle.push(vehicle);
      dataDevice.push(device);
    }

    Vehicle.create(dataVehicle, function(err, vehicles) {
      if (err) throw err;
      Device.create(dataDevice, function(err, devices) {
        if (err) throw err;
        let devices1 = devices.filter(function(device) {
          return device.motorCarrierId === 1;
        });
        let devices2 = devices.filter(function(device) {
          return device.motorCarrierId === 2;
        });
        let vehicles1 = vehicles.filter(function(vehicle) {
          return vehicle.motorCarrierId === 1;
        });
        let vehicles2 = vehicles.filter(function(vehicle) {
          return vehicle.motorCarrierId === 2;
        });

        for (var i = 0; i < devices1.length; i++) {
          devices1[i].vehicleId = vehicles1[i].id;
          devices1[i].save(function(err) {
            if (err) throw err;
          });
        }

        for (var j = 0; i < devices2.length; j++) {
          devices2[j].vehicleId = vehicles2[j].id;
          devices2[j].save(function(err) {
            if (err) throw err;
          });
        }
        console.log('Devices created succesfully');
      });
      cb(null, vehicles);
    });
  }

  // Simulate events and trackings
  async function Simulate(drivers, vehicles, cb) {
    await postgresDs.automigrate('Tracking');
    await postgresDs.automigrate('Event');
    let Event = app.models.Event;
    let Tracking = app.models.Tracking;
    let dateStart = new Date(Date.now());
    dateStart.setMonth(dateStart.getMonth() - 1);
    let dataEvents, dataTrackings, x, y, counter, latitude, longitude;
    let lastDayData = {};
    // 30 day simulation
    for (var i = 0; i < 30; i++) {
      let driverQueue = [];
      drivers.forEach(function(driver) {
        driverQueue.push(driver);
      });
      vehicles.forEach(function(vehicle) {
        if (!lastDayData[vehicle.id]) {
          lastDayData[vehicle.id] = {};
          latitude = randomInt(35, 40);
          longitude = randomInt(-115, -80);
        } else {
          latitude = lastDayData[vehicle.id].lat;
          longitude = lastDayData[vehicle.id].lng;
        }
        let sameCarrierDrivers = driverQueue.filter((driver) => {
          return driver.motorCarrierId === vehicle.motorCarrierId;
        });
        let driver = randomChoice(sameCarrierDrivers);
        let index = driverQueue.indexOf(driver);
        driverQueue.splice(index, 1);
        let today = new Date(dateStart);
        counter = 0;
        dataEvents = [];
        dataTrackings = [];
        if (driver) {
          for (var i = 0; i < DailyHours * 60 / TrackingTime; i++) {
            x = randomStep(-0.1, 0.1);
            y = randomStep(-0.1, 0.1);
            latitude = (35 < latitude + x && latitude + x < 40) ?
            latitude + x : latitude;
            longitude = (-115 < longitude + y && longitude + y < -80) ?
            longitude + y : longitude;
            if (i % (EventTime * 60 / TrackingTime) == 0) {
              var event = changeDutyStatusEvent(driver, vehicle,
                new Date(today), latitude, longitude);
              counter += 1;
              dataEvents.push(event);
            }
            today.setMinutes(today.getMinutes() + TrackingTime);
            let tracking = fakeTrack(driver, vehicle, new Date(today),
             latitude, longitude);
            dataTrackings.push(tracking);
          }
          lastDayData[vehicle.id].lat = latitude;
          lastDayData[vehicle.id].lng = longitude;

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
        };
      });
      dateStart.setDate(dateStart.getDate() + 1);
    }
    cb(null);
  }

  function fakeTrack(driver, car, today, lat, lng) {
    let speed = randomInt(0, 100);
    let driveTimeBoolean;
    if (Math.random() < 0.05) {
      driveTimeBoolean = true;
    } else {
      driveTimeBoolean = false;
    }
    let track = {
      'coordinates': GeoPoint({lat: lat, lng: lng}),
      'speed': speed,
      'timestamp': today,
      'speedLimitExceeded': (speed > 80), // if speed is greater than 80 limit is exceeded
      'driveTimeExceeded': driveTimeBoolean,
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
  //       'speedLimitExceeded': faker.random.boolean(),
  //       'driveTimeExceeded': faker.random.boolean(),
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
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomStep(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randomChoice(array) {
    let index = Math.floor(Math.random() * array.length);
    return array[index];
  }

  function changeDutyStatusEvent(driver, vehicle, today, lat, lng) {
    let accumulatedMiles = randomInt(0, 7000);
    let elapsedHours = randomInt(0, 50);
    let driverId, certifiedEvent, dateCertified;
    if (Math.random() < 0.05) {
      driverId = null;
      certifiedEvent = false;
      dateCertified = null;
    } else {
      driverId = driver.id;
      certifiedEvent = faker.random.boolean();
      if (certifiedEvent) dateCertified = faker.date.future();
    }
    var event = {
      'type': 1,
      'code': randomInt(1, 4),
      'timestamp': today,
      'shippingDocNumber': 'AAEECC1234',
      'recordStatus': randomInt(1, 4),
      'recordOrigin': randomInt(1, 4),
      'accumulatedVehicleMiles': accumulatedMiles,
      'elapsedEngineHours': elapsedHours,
      'coordinates': {
        'lat': lat,
        'lng': lng,
      },
      'distSinceLastValidCoords': randomInt(0, 6),
      'malfunctionIndicatorStatus': faker.random.boolean(),
      'dataDiagnosticEventIndicatorStatusForDriver':
      faker.random.boolean(),
      'dataCheckValue': 0,
      'annotation': faker.lorem.words(),
      'driverLocationDescription': faker.address.streetAddress(),
      'totalVehicleMiles': randomInt(accumulatedMiles, 9999000),
      'totalEngineHours': randomInt(elapsedHours, 99000),
      'timeZoneOffsetUtc': randomInt(4, 11),
      'dateOfCertifiedRecord': dateCertified,
      'reportStatus': faker.random.boolean(),
      'certified': certifiedEvent,
      'driverId': driverId,
      'vehicleId': vehicle.id,
      'motorCarrierId': driver.motorCarrierId,
    };
    return event;
  }
};
