'use strict';
var validator = require('validator');
var eld = require('../../server/eld.json');
var states = require('../../server/states.json');
var app = require('../../server/server.js');
var _         = require('lodash');
var loopback  = require('loopback');
var LoopBackContext = require('loopback-context');
var rolInt8 = require('bitwise-rotation').rolInt8;
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');

function extractDateTime(timestamp) {
  let date = new Date(Date.parse(timestamp));
  const hours = (date.getHours() < 10) ? '0' +  date.getHours() :
  '' + date.getHours();
  const minutes = (date.getMinutes() < 10) ? '0' +  date.getMinutes() :
  '' + date.getMinutes();
  const seconds = (date.getSeconds() < 10) ? '0' +  date.getSeconds() :
  '' + date.getSeconds();
  const day = (date.getDate() < 10) ? '0' +  date.getDate() :
  '' + date.getDate();
  const month = (date.getMonth() + 1 < 10) ? '0' +  (date.getMonth() + 1) :
  '' + (date.getMonth() + 1);
  const year = ('' + date.getFullYear()).slice(-2);
  let dateString = month + day + year;
  let timeString = hours + minutes + seconds;
  return [dateString, timeString];
};

function calculateLineChecksum(line) {
  let sum = 0;
  for (var i = 0; i < line.length; i++) {
    let character = line.charAt(i);
    if (/^\d+$/.test(character) || /[a-zA-Z]/.test(character)) {
      sum += character.charCodeAt() - 48;
    };
  };

  let hexadecimal = sum.toString(16).slice(-2); // 8-bit lower byte of hexa representation
  let binary = '0b' + parseInt(hexadecimal, 16).toString(2).padStart(8, '0'); // binary from hexa
  binary = '0b' + rolInt8(Number(binary), 3).toString(2); // 3 left rotations
  let checkValue = binary ^ '0b10010110'; // xor with hexa 96 (decimal 150)
  return Number(checkValue).toString(16);
};

function createFolderName(name) {
  return `${name}-${Math.round(Date.now())}-` +
    `${Math.round(Math.random() * 1000)}`;
};

function emailValidator(err) {
  if (!validator.isEmail(String(this.email))) return err();
}

function validateDriverLiceseNumber(err) {
  if (this.accountType.toUpperCase().trim() === 'D' &&
    (this.driverLicenseNumber === undefined ||
    this.driverLicenseNumber.trim() === ''))
    return err();
}

function validateLicensesIssuingState(err) {
  if (this.accountType.toUpperCase().trim() === 'D' &&
  (this.licenseIssuingState === undefined ||
    this.licenseIssuingState.trim() === ''))
    return err();
}

function validateLicensesIssuingCountry(err) {
  if (this.accountType.toUpperCase().trim() === 'D' &&
  (this.licenseIssuingCountry === undefined ||
    this.licenseIssuingCountry.trim() === ''))
    return err();
}

function validateLicensesIssuingCountry2(err) {
  let countries = ['USA', 'Mexico', 'Canada', 'Other'];
  if (this.accountType.toUpperCase().trim() === 'D' &&
  !countries.includes(this.licenseIssuingCountry.trim()))
    return err();
}

function validateLicensesIssuingState2(err) {
  if (this.accountType.toUpperCase().trim() === 'D') {
    let valid = false;
    for (let state of states[this.licenseIssuingCountry]) {
      if (state.code === this.licenseIssuingState) {
        valid = true;
        break;
      }
    }
    if (!valid) return err();
  }
}

function validateAccountStatus(err) {
  if (this.accountType.toUpperCase().trim() === 'D' &&
    this.accountStatus === undefined)
    return err();
}

function validateExemptDriverConfiguration(err) {
  if (this.accountType.toUpperCase() === 'D' &&
    !['E', '0'].includes(this.exemptDriverConfiguration))
    return err();
}

function validateTimeZoneOffsetUtc(err) {
  if ((this.accountType.trim() === 'D' &&
    this.timeZoneOffsetUtc === undefined) ||
  (this.accountType.trim() === 'D' &&
    !Number.isInteger(this.timeZoneOffsetUtc)) ||
  (this.accountType.trim() === 'D' &&
   (this.timeZoneOffsetUtc < 4 || this.timeZoneOffsetUtc > 11)))
    err();
}

function validateStartingTime24HourPeriod(err) {
  if (this.accountType.toUpperCase().trim() === 'D' &&
   this.startingTime24HourPeriod === undefined)
    return err();
}

function firstNameValidator(err) {
  if (this.firstName && this.firstName.trim() === '') return err();
}

function lastNameValidator(err) {
  if (this.lastName && this.lastName.trim() === '') return err();
}

function capitalize(str) {
  return str.trim().charAt(0).toUpperCase() + str.trim().slice(1);
}

module.exports = function(Person) {
  // validations
  Person.validatesPresenceOf(
    'firstName', 'lastName', 'username', 'accountType',
    {'message': "Can't be blank"}
  );

  // Blank content
  Person.validate('firstName', firstNameValidator,
  {message: "First Name can't be blank"});
  Person.validate('lastName', lastNameValidator,
  {message: "Last Name can't be blank"});

  // Other
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
  Person.validate('licenseIssuingCountry', validateLicensesIssuingCountry,
    {'message': "Can't be blank when accountType is D"});
  Person.validate('licenseIssuingCountry', validateLicensesIssuingCountry2,
    {'message':
    "Issuing country can only be one of 'USA', 'Mexico', 'Canada' or 'Other'"});
  Person.validate('licenseIssuingState', validateLicensesIssuingState2,
    {'message': 'Invalid licence issuing state code'});
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
      var NOW = Date.now();
      LastMod.people = NOW;
      LastMod.save(function(error) {
        if (error) throw (error);
        next();
      });
    });
  });
/*
  Person.afterRemote('**', function(ctx, modelInstance, next) {
    app.models.LastMod.findOne({}, function(err, LastMod) {
      ctx.res.set('LastMod', LastMod.people.toISOString());
      next();
    });
  });
*/
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

  // Certify all the uncertified events for a driver
  Person.certifyEvents = function(id, req, cb) {
    Person.findById(id, function(err, person) {
      if (err) {
        return cb(err);
      }
      if (!person) {
        err = Error('Person not found');
        err.statusCode = '404';
        cb(err, 'Person not found');
      } else if (person.accountType !== 'D') {
        err = Error('Person is not a driver.');
        err.statusCode = '422';
        return cb(err, 'Person is not a driver');
      } else {
        let context = LoopBackContext.getCurrentContext();
        let currentUser = context && context.get('currentUser');
        if (currentUser && currentUser.id !== person.id &&
          currentUser.accountType === 'D') {
          let err = Error('Cannot modify another driver records');
          err.statusCode = '401';
          return cb(err, 'Cannot modify another driver records');
        }
        person.events.find(
          {
            where: {
              certified: false,
            },
          }, function(error, events) {
          if (error) {
            return cb(error);
          }
          let usefulEvents;
          if (req && req.eventsIds && (req.eventsIds.length > 0)) {
            usefulEvents = events.filter(function(element) {
              return req.eventsIds.indexOf(element.id) != -1;
            });
          } else {
            usefulEvents = events;
          }

          usefulEvents.forEach(function(event) {
            let oldData = {
              certified: true,
              dateOfCertifiedRecord: Date.now(),
            };
            let duplicatedData = Object.assign({}, event.__data);
            delete duplicatedData.id;
            // Create Referece with original event and update data
            duplicatedData.referenceId = event.__data.id;
            duplicatedData.type = 4;
            if (event.type === 4) {
              duplicatedData.code = Math.min(event.code + 1, 9);
            } else {
              duplicatedData.code = 1;
            }
            duplicatedData.annotation = 'Certify event #' + String(event.id);
            duplicatedData.recordOrigin = 2;
            event.updateAttributes(oldData, function(err, _) {
              if (err) throw err;
            });
            Person.app.models.Event.create(duplicatedData,
              function(err, _) {
                if (err) throw err;
              });
          });
          return cb(null, {'message': usefulEvents.length +
          ' events certified'}); // revisar que respuesta se debe enviar
        });
      }
    });
  };

  Person.remoteMethod(
    'certifyEvents',
    {
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'req', type: 'object'},
      ],
      http: {path: '/:id/certifyEvents', verb: 'patch'},
      returns: {arg: 'message', type: 'string'},
      description: [
        'Certify all the uncertified events for a driver.',
        'If req is given, certify only the records given by eventsIds',
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

      if (events == undefined || events == null || events.length == null ||
       events.length == 0) {
        let problem = Error('No events during last week for current driver');
        problem.statusCode = '404';
        return cb(problem, 'No events found for driver');
      }
      let currentUserEvents = [];
      events.forEach(function(event) {
        let e = event.toJSON();
        currentUserEvents.push(e);
      });

      Person.app.models.Event.find({
        where: {
          timestamp: {gt: DATE_LIMIT},
          vehicleId: currentUserEvents[0].vehicleId,
        }, order: 'timestamp DESC',
        include: ['driver', 'codriver', 'vehicle', 'motorCarrier'],
      }, function(err, elements) {
        if (err) return cb(err);
        let currentCMVEvents = [];
        elements.forEach(function(element) {
          let elem = element.toJSON();
          currentCMVEvents.push(elem);
        });

        Person.app.models.Event.find({
          where: {
            timestamp: {gt: DATE_LIMIT},
            driverId: null,
            motorCarrierId: person.motorCarrierId,
          }, order: 'timestamp DESC',
          include: ['driver', 'codriver', 'vehicle', 'motorCarrier'],
        }, function(error, unidentifiedEvents) {
          if (error) return cb(error);
          let unidentifiedUserEvents = [];
          unidentifiedEvents.forEach(function(element) {
            let elem = element.toJSON();
            unidentifiedUserEvents.push(elem);
          });
          return cb(null, currentUserEvents, currentCMVEvents,
           unidentifiedUserEvents);
        });
      });
    });
  };

  Person.sendReport = function(id, comment, cb) {
    Person.findById(id, function(err, person) {
      if (err) {
        return cb(err);
      }
      if (!person) {
        err = Error('Person not found');
        err.statusCode = '404';
        cb(err, 'Person not found');
      } else if (person.accountType !== 'D') {
        err = Error('Person found but not a driver.');
        err.statusCode = '422';
        cb(err, 'Person is not a driver');
      } else {
        Person.getReportData(person,
         function(error, currentUserEvents, currentCMVEvents,
          unidentifiedUserEvents) {
           if (error) return cb(error);
           let folderName = createFolderName('Report');
           let fileName =  Person.reportFileName(
            currentUserEvents[0]);
           let header = Person.reportHeader(currentUserEvents[0], comment);
           let userList = Person.reportUserList(currentCMVEvents);
           let cmvList = Person.reportCmvList(currentUserEvents);
           let eventsandComments = Person.reportEventListandComments(
            currentUserEvents, cmvList[1], userList[1]);
           let eventsList = eventsandComments[0];
           let comments = eventsandComments[1];
           let certificationList = Person.reportCertificationList(
            currentUserEvents, cmvList[1]);
           let malfunctionList = Person.reportMalfunctionList(
            currentUserEvents, cmvList[1]);
           let loginout = Person.reportLoginout(currentUserEvents);
           let powerActivity = Person.reportPowerActivity(currentUserEvents);
           let unidentifiedUser = Person.reportUnidentifiedUser(
            unidentifiedUserEvents, cmvList[1]);
           let fileCheckValue = Person.reportFileCheckValue();
           let report = header + userList[0] + cmvList[0] + eventsList +
           comments + certificationList + malfunctionList + loginout +
           powerActivity + unidentifiedUser + fileCheckValue;
           console.log(report);
           let filePath = './tmp/' + folderName + '/' + fileName + '.csv';
           mkdirp(path.dirname(filePath), function(err) {
             if (err) cb(err);

             fs.writeFile(filePath, report, function(erro) {
               if (erro) return cb(erro, 'Error creating file');
               // cb(null, filePath, report);
               Person.app.models.Email.send(
                 {
                   to: [eld.FMCSAEmailAddress, person.email],
                   from: person.email,
                   subject: `ELD records from ${eld.registration_id}`,
                   text: comment,
                   attachments: [path.resolve(filePath)],
                 }
               ).then(response => {
                 fs.unlink(filePath, (err) => {
                   if (err) throw err;
                   fs.rmdir(path.dirname(filePath), (err) => {
                     if (err) throw err;
                   });
                 });
                 cb(null, response.message);
               }).catch(error => cb(error));
             });
           });
         });
      };
    });
  };

  Person.remoteMethod(
    'sendReport',
    {
      accepts: [
        {arg: 'id', type: 'number', required: true},
        {arg: 'comment', type: 'string'},
      ],
      http: {path: '/:id/sendReport', verb: 'get'},
      returns: {arg: 'data', type: 'string'},
      description: [
        'Send a report associated to the corresponding driver and vehicle',
      ],
    });

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
      newLine = newLine + delimiter + calculateLineChecksum(newLine);
      newLine = newLine + lineBreak;
      section += newLine;
    });
    return section;
  };

  Person.reportHeader = function(data, outputComment) {
    const header = 'ELD File Header Segment:';
    let driver = data.driver;
    let codriver = data.codriver;
    let vehicle = data.vehicle;
    let motorCarrier = data.motorCarrier;
    let lines = [];

    let date = extractDateTime(data.timestamp);

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
      driver.startingTime24HourPeriod,
      driver.timeZoneOffsetUtc,
    ], [
      data.shippingDocNumber,
      driver.exemptDriverConfiguration,
    ], [
      date[0],
      date[1],
      data.coordinates.lat.toFixed(2),
      data.coordinates.lng.toFixed(2),
      data.totalVehicleMiles,
      data.totalEngineHours,
    ], [
      eld.registration_id,
      eld.identifier,
      eld.auth_value,
      outputComment,
    ]);  // faltan los checkline de cada linea
    return Person.reportSection(header, lines);
  };

  Person.reportUserList = function(data) {
    const header = 'User List:';
    let lines = [];
    let uniqueUserIds = [];
    let counter = 1;
    let userListNumber = {};

    data.forEach(function(event) {
      let driver = event.driver;
      let codriver = event.codriver;
      if (driver == undefined) {
        driver = {};
        driver.id = null;
        driver.accountType = null;
        driver.firstName = null;
        driver.lastName = null;
      }
      if (driver != undefined && uniqueUserIds.indexOf(driver.id) == -1) {
        lines.push([
          counter,
          driver.accountType,
          driver.lastName,
          driver.firstName,
        ]);
        userListNumber[event.driverId] = counter;
        counter += 1;
        uniqueUserIds.push(driver.id);
      }
      if (codriver != undefined && uniqueUserIds.indexOf(codriver.id) == -1) {
        lines.push([
          counter,
          event.driver.accountType,
          event.driver.lastName,
          event.driver.firstName,
        ]);
        userListNumber[event.codriverId] = counter;
        counter += 1;
        uniqueUserIds.push(codriver.id);
      }
    });

    return [Person.reportSection(header, lines), userListNumber];
  };

  Person.reportCmvList = function(data) {
    const header = 'CMV List:';
    let lines = [];
    let uniqueVehicleIds = [];
    let counter = 1;
    let cmvListNumber = {};

    data.forEach(function(event) {
      let vehicle = event.vehicle;
      if (uniqueVehicleIds.indexOf(vehicle.id) == -1) {
        lines.push([
          counter,
          vehicle.CmvPowerUnitNumber,
          vehicle.vin,
        ]);
        cmvListNumber[vehicle.id] = counter;
        counter += 1;
        uniqueVehicleIds.push(vehicle.id);
      };
    });
    return [Person.reportSection(header, lines), cmvListNumber];
  };

  Person.reportEventListandComments = function(data, cmvListNumber,
   userListNumber) {
    const header = 'ELD Event List:';
    const header2 = 'ELD Event Annotations or Comments:';
    let lines = [];
    let lines2 = [];

    data.forEach(function(event) {
      if ([1, 2, 3].indexOf(event.type) != -1) {
        let date = extractDateTime(event.timestamp);
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
          event.coordinates.lat.toFixed(2),
          event.coordinates.lng.toFixed(2),
          event.distSinceLastValidCoords,
          cmvListNumber[event.vehicleId],
          userListNumber[event.driverId],
          event.malfunctionIndicatorStatus ? 1 : 0,
          event.dataDiagnosticEventIndicatorStatusForDriver ? 1 : 0,
          event.dataCheckValue,
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

  Person.reportCertificationList = function(data, cmvListNumber) {
    const header = 'Driver’s Certification/Recertification Actions:';
    let lines = [];

    data.forEach(function(event) {
      if (event.type == 4) {
        let date = extractDateTime(event.timestamp);
        lines.push([
          event.sequenceId,
          event.code,
          date[0],
          date[1],
          event.dateOfCertifiedRecord,
          cmvListNumber[event.vehicleId],
        ]);
      }
    });
    return Person.reportSection(header, lines);
  };

  Person.reportMalfunctionList = function(data, cmvListNumber) {
    const header = 'Malfunctions and Data Diagnostic Events:';
    let lines = [];

    data.forEach(function(event) {
      if (event.type == 7) {
        let date = extractDateTime(event.timestamp);
        lines.push([
          event.sequenceId,
          event.code,
          event.diagnosticCode,
          date[0],
          date[1],
          event.totaVehicleMiles,
          event.totalEngineHours,
          cmvListNumber[event.vehicleId],
        ]);
      }
    });
    return Person.reportSection(header, lines);
  };

  Person.reportLoginout = function(data) {
    const header = 'ELD Login/Logout Report:';
    let lines = [];

    data.forEach(function(event) {
      if (event.type == 5) {
        let date = extractDateTime(event.timestamp);
        lines.push([
          event.sequenceId,
          event.code,
          event.driver.username,
          date[0],
          date[1],
          event.totaVehicleMiles,
          event.totalEngineHours,
        ]);
      }
    });
    return Person.reportSection(header, lines);
  };

  Person.reportPowerActivity = function(data) {
    const header = 'CMV Engine Power-Up and Shut Down Activity:';
    let lines = [];

    data.forEach(function(event) {
      if (event.type == 6) {
        let date = extractDateTime(event.timestamp);
        lines.push([
          event.sequenceId,
          event.code,
          date[0],
          date[1],
          event.totaVehicleMiles,
          event.totalEngineHours,
          event.coordinates.lat.toFixed(2),
          event.coordinates.lng.toFixed(2),
          event.vehicle.CmvPowerUnitNumber,
          event.vehicle.vin,
          event.vehicle.trailerNumber,
          event.shippingDocNumber,
        ]);
      }
    });
    return Person.reportSection(header, lines);
  };

  Person.reportUnidentifiedUser = function(data, cmvListNumber) {
    const header = 'Unidentified Driver Profile Records:';
    let lines = [];

    data.forEach(function(event) {
      if (event.driverId == null) {
        let date = extractDateTime(event.timestamp);
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
          event.coordinates.lat.toFixed(2),
          event.coordinates.lng.toFixed(2),
          event.distSinceLastValidCoords,
          cmvListNumber[event.vehicleId],
          event.malfunctionIndicatorStatus ? 1 : 0,
          event.dataCheckValue,
        ]);
      };
    });
    return Person.reportSection(header, lines);
  };

  Person.reportFileCheckValue = function(numbers) {
    let header = 'End of File:' + String.fromCharCode(10);
    header += 'FileChecksum' + String.fromCharCode(10); // missing file checksum calculation
    return header;
  };

  Person.reportFileName = function(data) {
    let fileName = '';
    let driver = data.driver;
    let date = extractDateTime(Date(Date.now()));
    fileName += driver.lastName.substring(0, 5).padEnd(5, '_');
    fileName += driver.driverLicenseNumber.toString().slice(-2);
    fileName += driver.driverLicenseNumber.toString().split('').map(Number)
    .reduce(function(a, b) { return a + b; }, 0).toString().slice(-2)
    .padStart(2, '0');
    fileName += date[0] + '-';
    fileName = fileName.padEnd(25, '0');
    return fileName;
  };
};
