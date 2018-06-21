'use strict';
module.exports = function(app) {
  var Role = app.models.Role;

  Role.registerResolver('A', function(role, context, cb) {
    var userId = context.accessToken.userId;
    if (!userId) {
      return process.nextTick(() => cb(null, false));
    }
    var Person = app.models.Person;
    Person.findById(userId, function(err, user) {
      if (err) return cb(err);
      if (user.accountType == 'A') {
        return cb(null, true);
      } else {
        return process.nextTick(() => cb(null, false));
      }
    });
  });

  Role.registerResolver('S', function(role, context, cb) {
    var userId = context.accessToken.userId;
    if (!userId) {
      return process.nextTick(() => cb(null, false));
    }
    if (context.modelId) {
      context.model.findById(context.modelId, function(err, modelInstance) {
        if (err) return cb(err);
        if (!modelInstance) return cb(new Error(context.modelName + '/{' +
        context.modelId + '} not found'));
        var Person = app.models.Person;
        Person.findById(userId, function(err, user) {
          if (err) return cb(err);
          let isSupport = user.accountType == 'S';
          let ctxModel = context.modelName;
          if (isSupport &&
            ctxModel === 'MotorCarrier' &&
            user.motorCarrierId === modelInstance.id) {
            return cb(null, true);
          } else if ((isSupport &&
              ctxModel === 'Person' || ctxModel === 'Vehicle' ||
              ctxModel === 'Trailer'
            ) && user.motorCarrierId === modelInstance.motorCarrierId) {
            return cb(null, true);
          } else {
            return process.nextTick(() => cb(null, false));
          }
        });
      });
    } else {
      return process.nextTick(() => cb(null, false));
    }
  });

  // TODO agregar ACLs
  Role.registerResolver('D', function(role, context, cb) {
    var userId = context.accessToken.userId;
    if (!userId) {
      return process.nextTick(() => cb(null, false));
    }
    var Person = app.models.Person;
    if (context.modelId) {
      context.model.findById(context.modelId, function(err, modelInstance) {
        if (err) return cb(err);
        if (!modelInstance) return cb(new Error('Model instance not found'));
        var Person = app.models.Person;
        Person.findById(userId, function(err, user) {
          if (err) return cb(err);
          let isDriver = user.accountType == 'D';
          let ctxModel = context.modelName;
          if (isDriver && ctxModel === 'MotorCarrier' &&
            user.motorCarrierId === modelInstance.id) {
            return cb(null, true);
          } else if (isDriver && ctxModel === 'Person' &&
              user.id == modelInstance.id) {
            return cb(null, true);
          } else if (isDriver && ctxModel === 'Event' &&
              (user.id === modelInstance.driverId ||
              user.id === modelInstance.codriverId ||
              modelInstance.driverId == null)) {
            return cb(null, true);
          } else if (isDriver && ctxModel === 'Tracking' &&
              user.id === modelInstance.personId) {
            return cb(null, true);
          } else {
            return process.nextTick(() => cb(null, false));
          }
        });
      });
    } else {
      return process.nextTick(() => cb(null, false));
    }
  });
};
