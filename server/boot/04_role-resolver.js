module.exports = function(app) {
  var Role = app.models.Role;

  Role.registerResolver('S', function(role, context, cb) {
    var userId = context.accessToken.userId;
    if (!userId) {
      return process.nextTick(() => cb(null, false));
    }
    // console.log(context);
    // if (context.modelName === 'Person') {
    //
    // }
    // if (context.modelName === 'MotorCarrier') {
    //   return process.nextTick(() => cb(null, false));
    // }
    context.model.findById(context.modelId, function(err, modelInstance) {
      if (err) return cb(err);
      if (!modelInstance) return cb(new Error('Motor Carrier not found'));
      var Person = app.models.Person;
      Person.findById(userId, function(err, user) {
        if (err) return cb(err);
        if (context.modelName === 'MotorCarrier' &&
          user.motorCarrierId === modelInstance.id) {
          return cb(null, true);
        } else if ((context.modelName === 'Person' ||
            context.modelName === 'Vehicle') &&
            user.motorCarrierId === modelInstance.motorCarrierId) {
          return cb(null, true);
        }
        // else if (context.modelName === 'Vehicle') {
        //   console.log(modelInstance);
        //   return cb(null, true);
        // }
        return process.nextTick(() => cb(null, false));
      });
    });
  });
};
