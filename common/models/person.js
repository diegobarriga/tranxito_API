'use strict';
var validator = require('validator');
var app = require('../../server/server.js');
var _         = require('lodash');
var loopback  = require('loopback');

function emailValidator(err) {
  if (!validator.isEmail(String(this.email))) return err();
}

function validateDriverLiceseNumber(err) {
  if (this.accountType === 'D' && this.driverLicenseNumber === undefined)
    err();
}

function validateLicensesIssuingState(err) {
  if (this.accountType === 'D' && this.licenseIssuingState === undefined)
    err();
}

function validateAccountStatus(err) {
  if (this.accountType === 'D' && this.accountStatus === undefined) err();
}

function validateExemptDriverConfiguration(err) {
  if ((this.accountType === 'D' &&
    this.exemptDriverConfiguration === undefined) ||
   (this.accountType === 'D' &&
    !['E', '0'].includes(this.exemptDriverConfiguration)))
    err();
}

function validateTimeZoneOffsetUtc(err) {
  if ((this.accountType === 'D' && this.timeZoneOffsetUtc === undefined) ||
  (this.accountType === 'D' && !Number.isInteger(this.timeZoneOffsetUtc)) ||
  (this.accountType === 'D' &&
   (this.timeZoneOffsetUtc < 4 || this.timeZoneOffsetUtc > 11)))
    err();
}

function validateStartingTime24HourPeriod(err) {
  if (this.accountType === 'D' &&
   this.startingTime24HourPeriod === undefined)
    err();
}

module.exports = function(Person) {
  // validations
  Person.validatesPresenceOf(
    'firstName', 'lastName', 'username', 'accountType',
    {'message': "Can't be blank"}
  );
  Person.validatesLengthOf('firstName', {min: 2, max: 30});
  Person.validatesLengthOf('lastName', {min: 2, max: 30});
  Person.validatesLengthOf('email', {min: 4, max: 60});
  Person.validate(
    'email', emailValidator, {message: 'Must provide a valid email'}
  );
  Person.validatesInclusionOf('accountType', {'in': ['A', 'D', 'S']});
  Person.validate('driverLicenseNumber', validateDriverLiceseNumber,
    {'message': "Can't be blank when accountType is D"});
  Person.validate('licenseIssuingState', validateLicensesIssuingState,
    {'message': "Can't be blank when accountType is D"});
  Person.validate('accountStatus', validateAccountStatus,
    {'message': "Can't be blank when accountType is D"});
  Person.validate(
    'exemptDriverConfiguration', validateExemptDriverConfiguration,
    {'message': "Can't be blank when accountType is D"});
  Person.validate('timeZoneOffsetUtc', validateTimeZoneOffsetUtc,
    {'message': "Can't be blank when accountType is D"});
  Person.validate(
    'startingTime24HourPeriod', validateStartingTime24HourPeriod,
    {'message': "Can't be blank when accountType is D"});

  // role assingment
  Person.observe('after save', function(context, next) {
    var Role = app.models.Role;
    var RoleMapping = app.models.RoleMapping;
    Role.findOne({
      where: {name: context.instance.accountType},
    }, function(err, role) {
      if (context.isNewInstance) {
        RoleMapping.create({
          principalType: RoleMapping.USER,
          principalId: context.instance.id,
          roleId: role.id,
        });
      };
      next();
    });
  });

  Person.observe('after save', function(context, next) {
    app.models.LastMod.findOne({}, function(err, LastMod) {
      if (err) throw (err);
      LastMod.people = Date.now();
      LastMod.save(function(error, LM) {
        if (error) throw (error);
        next();
      });
    });
  });

  Person.setImage = function(id, image, cb) {
    Person.findById(id, function(err, person) {
      if (err) {
        return cb(err);
      }
      if (!person) {
        err = Error('Person not found');
        err.statusCode = '404';
        cb(err, 'Person not found');
      } else {
        person.image = image;
        person.save();
        cb(null, 'Image set correctly');
      }
    });
  };

  Person.remoteMethod('setImage', {
    accepts: [
      {arg: 'id', type: 'number', required: true},
      {arg: 'image', type: 'string', required: true},
    ],
    returns: {arg: 'message', type: 'string'},
    http: {path: '/:id/setImage', verb: 'post'},
  });

  Person.softDelete = function(id, cb) {
    Person.findById(id, function(err, person) {
      if (err) {
        return cb(err);
      }
      if (!person) {
        err = Error('Person not found');
        err.statusCode = '404';
        cb(err, 'Person not found');
      } else {
        person.accountStatus = false;
        person.save(function(err, person) {
          cb(err, person);
        });
      }
    });
  };

  Person.remoteMethod(
    'softDelete',
    {
      accepts: {arg: 'id', type: 'number', required: true},
      returns: {arg: 'message', type: 'string', root: true},
      http: {path: '/:id/', verb: 'delete'},
      description: ['Soft delete of a model instance'],
    });

  Person.dutyStatusChange = function(id, cb) {
    Person.findById(id, function(err, person) {
      if (err) {
        return cb(err);
      }
      if (!person) {
        err = Error('Person not found');
        err.statusCode = '404';
        cb(err, 'Person not found');
      } else if (person.accountType !== 'D') {
        console.log(person);
        err = Error('Person found but not a driver.');
        err.statusCode = '422';
        cb(err, 'Person is not a driver');
      } else {
        const ONE_DAY = 24 * 60 * 60 * 1000;
        const DATE_LIMIT = Date.now() - ONE_DAY;
        person.events.find(
          {
            where: {
              type: 1,
              timestamp: {gt: DATE_LIMIT},
            },
          }, function(erro, data) {
          if (erro) return cb(erro);
          person.events.findOne(
            {
              order: 'timestamp DESC',
              where: {
                type: 1,
                timestamp: {lt: DATE_LIMIT},
              },
            }, function(error, first) {
            if (error) return cb(error);
            cb(null, [first ? first : {}, data]);
          });
        });
      }
    });
  };

  Person.remoteMethod(
    'dutyStatusChange',
    {
      accepts: {arg: 'id', type: 'string', required: true},
      http: {path: '/:id/dutyStatusChange', verb: 'get'},
      returns: {arg: 'data', type: 'string'},
      description: [
        'Get the events associated to duty-status change',
        'for the specified driver from the last 24 hour',
      ],
    });

  Person.getReportData = function(person, cb) {
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
    const DATE_LIMIT = Date.now() - ONE_WEEK;
    person.events.find(
      {
        where: {
          timestamp: {gt: DATE_LIMIT},
        }, order: 'timestamp DESC',
        include: ['driver', 'codriver', 'vehicle', 'motorCarrier'],
      }, function(erro, events) {
      if (erro) return cb(erro);
      if (!events) {
        return cb(erro, 'No events found for driver');
      }
      let data = [];
      events.forEach(function(event) {
        let e = event.toJSON();
        data.push(e);
      });
      return cb(null, data);
    });
  };

  Person.getReport = function(id, cb) {
    Person.findById(id, function(err, person) {
      if (err) {
        return cb(err);
      }
      if (!person) {
        err = Error('Person not found');
        err.statusCode = '404';
        cb(err, 'Person not found');
      } else if (person.accountType !== 'D') {
        console.log(person);
        err = Error('Person found but not a driver.');
        err.statusCode = '422';
        cb(err, 'Person is not a driver');
      } else {
        Person.getReportData(person, function(err, data) {
          if (err) throw err;
          const containerName = Person.createContainerName('Report');
          const header = Person.reportHeader(data[0]);
          const cmvList = Person.reportCmvList(data);
          let reportEventsandComments = Person.reportEventListandComments(data);
          const reportEventsList = reportEventsandComments[0];
          const reportComments = reportEventsandComments[1];
          const reportCertificationList = Person.reportCertificationList(data);
          console.log(header + cmvList + reportEventsList + reportComments);
          cb(null, header + cmvList);
        });
      }
    });
  };

  Person.remoteMethod(
    'getReport',
    {
      accepts: {arg: 'id', type: 'string', required: true},
      http: {path: '/:id/getReport', verb: 'get'},
      returns: {arg: 'data', type: 'string'},
      description: [
        'Get a report associated to the corresponding driver and vehicle',
      ],
    });

  Person.createContainerName = function(name) {
    return `${name}-${Math.round(Date.now())}-
      ${Math.round(Math.random() * 1000)}`;
  };

  Person.reportSection = function(header, lines) {
    let delimiter = ',';
    let lineBreak = String.fromCharCode(10);
    var section = header + lineBreak;
    lines.forEach(function(line) {
      let newLine = '';
      line.forEach(function(element) {
        newLine += element + delimiter;
      });
      newLine = newLine.replace(/(^[,]+)|([,]+$)/g, '');
      newLine = newLine + lineBreak;
      section += newLine;
    });
    return section;
  };

  Person.reportHeader = function(data) {
    const header = 'ELD File Header Segment:';
    let driver = data.driver;
    let codriver = data.codriver;
    let vehicle = data.vehicle;
    let motorCarrier = data.motorCarrier;
    let lines = [];

    let date = Person.extractDateTime(data.timestamp);

    lines.push([
      driver.lastName,
      driver.firstName,
      driver.username,
      driver.licenseIssuingState,
      driver.driverLicenseNumber,
    ], [
      (codriver === undefined) ? null : codriver.lastName,
      (codriver === undefined) ? null : codriver.firstName,
      (codriver === undefined) ? null : codriver.username,
    ], [
      vehicle.CmvPowerUnitNumber,
      vehicle.vin,
      vehicle.trailerNumber,
    ], [
      motorCarrier.usdotNumber,
      motorCarrier.name,
      motorCarrier.multidayBasisUsed,
      motorCarrier.startingTime24HourPeriod,
      motorCarrier.timeZoneOffsetUtc,
    ], [
      data.shippingDocNumber,
      data.exemptDriverConfiguration,
    ], [
      date[0],
      date[1],
      data.coordinates.lat,
      data.coordinates.lng,
      data.totaVehicleMiles,
      data.totalEngineHours,
    ]);  // falta una linea de datos del eld y los checkline de cada linea
    return Person.reportSection(header, lines);
  };

  Person.reportUserList = function(data) {
    const header = 'ELD File Header Segment:';
    let lines = [];
    let counter = 1;
  };

  Person.reportCmvList = function(data) {
    const header = 'CMV List:';
    let lines = [];
    let counter = 1;

    data.forEach(function(event) {
      let vehicle = event.vehicle;

      lines.push([
        counter,
        vehicle.CmvPowerUnitNumber,
        vehicle.vin,
        // falta check line
      ]);
      counter += 1;
    });
    return Person.reportSection(header, lines);
  };

  Person.reportEventListandComments = function(data) {
    const header = 'ELD Event List:';
    const header2 = 'ELD Event Annotations or Comments:';
    let lines = [];
    let lines2 = [];

    data.forEach(function(event) {
      if ([1, 2, 3].indexOf(event.type) != -1) {
        let date = Person.extractDateTime(event.timestamp);
        lines.push([
          event.sequenceId,
          event.recordStatus,
          event.recordOrigin,
          event.type,
          event.code,
          date[0],
          date[1],
          event.accumulatedVehicleMiles,
          event.elapsedEngineHours,
          event.coordinates.lat,
          event.coordinates.lng,
          event.distSinceLastValidCoords,
          // corresponding cmv number
          // corresponding user number
          event.malfunctionIndicatorStatus,
          event.dataDiagnosticEventIndicatorStatusForDriver,
          event.dataCheckValue,
          //line data check value
        ]);

        lines2.push([
          event.sequenceId,
          event.driver.username,
          event.annotation,
          date[0],
          date[1],
          event.driverLocationDescription,
        ]);
      }
    });
    return [Person.reportSection(header, lines),
      Person.reportSection(header2, lines2)];
  };

  Person.reportCertificationList = function(data) {
    const header = 'Driver’s Certification/Recertification Actions:';
    let lines = [];

    data.forEach(function(event) {
      if (event.type == 4) {
        let date = Person.extractDateTime(event.timestamp);
        lines.push([
          event.sequenceId,
          event.code,
          date[0],
          date[1],
          event.dateOfCertifiedRecord,
          // corresponding cmv number
          //line data check value
        ]);
      }
    });
    return Person.reportSection(header, lines);
  };

  Person.extractDateTime = function(timestamp) {
    let date = new Date(Date.parse(timestamp));
    return [1, 2]; // buscar formato de date y time
  };
};
