module.exports = {
    setVariableTypes: setVariableTypes,
    log: log
  }

  function setVariableTypes(requestParams, context, ee, next) {
    // Change type of variables so the server wont return an error
    context.vars['lat'] = parseFloat(context.vars['lat']);
    context.vars['lng'] = parseFloat(context.vars['lng']);
    context.vars['speed'] = parseFloat(context.vars['speed']);
    
    // console.log(requestParams);
    // console.log(context);


    return next(); // MUST be called for the scenario to continue
  }

  function log(requestParams, response, context, ee, next) {
    // console.log(requestParams)
    // console.log(context)
    // console.log(response.headers);
    console.log(response.body);
    return next(); // MUST be called for the scenario to continue
  }