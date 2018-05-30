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
      if (user.account_type == 'A') {
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
        if (!modelInstance) return cb(new Error('Motor Carrier not found'));
        var Person = app.models.Person;
        Person.findById(userId, function(err, user) {
          if (err) return cb(err);
          if (user.account_type == 'S' &&
            context.modelName === 'MotorCarrier' &&
            user.motorCarrierId === modelInstance.id) {
            return cb(null, true);
          } else if ((user.account_type == 'S' &&
              context.modelName === 'Person' ||
              context.modelName === 'Vehicle') &&
              user.motorCarrierId === modelInstance.motorCarrierId) {
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
