

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
  console.log(carrier);

  var people = createPeople(carrier, function(err) {
    if (err) throw err;
    console.log('> models created sucessfully');
  });
  var people = await people.then(function(res){
    return res;
  })
  console.log(people);

  var driver = createDrivers(people, function(err) {
    if (err) throw err;
    console.log('> models created sucessfully');
  });
  var driver = await driver.then(function(res){
    return res;
  })
  console.log(driver);

  var vehicle = createVehicles(carrier, function(err) {
    if (err) throw err;
    console.log('> models created sucessfully');
  });
  var vehicle = await vehicle.then(function(res){
    return res;
  })
  console.log(vehicle);




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
    console.log('vehicles created!')
    return vehicle;
  }

  //create events
  function createEvents(drivers, vehicles, cb) {
    mongoDs.automigrate('Event', function(err) {
      if (err) return cb(err);
      var Event= app.models.Event;
      var DAY_IN_MILLISECONDS = 1000 * 60 * 60 * 24;
      Event.create([
        {
          date: Date.now() - (DAY_IN_MILLISECONDS * 4),
          rating: 5,
          comments: 'A very good coffee shop.',
          publisherId: reviewers[0].id,
          coffeeShopId: coffeeShops[0].id,
        },
        {
          date: Date.now() - (DAY_IN_MILLISECONDS * 3),
          rating: 5,
          comments: 'Quite pleasant.',
          publisherId: reviewers[1].id,
          coffeeShopId: coffeeShops[0].id,
        },
        {
          date: Date.now() - (DAY_IN_MILLISECONDS * 2),
          rating: 4,
          comments: 'It was ok.',
          publisherId: reviewers[1].id,
          coffeeShopId: coffeeShops[1].id,
        },
        {
          date: Date.now() - (DAY_IN_MILLISECONDS),
          rating: 4,
          comments: 'I go here everyday.',
          publisherId: reviewers[2].id,
          coffeeShopId: coffeeShops[2].id,
        }
      ], cb);
      console.log('events created!')
    });
  }
};