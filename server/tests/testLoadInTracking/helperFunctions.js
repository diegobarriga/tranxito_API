module.exports = {
    setVariableTypes: setVariableTypes,
    log: log
  }

  function setVariableTypes(requestParams, context, ee, next) {
    // Change type of variables so the server wont return an error
    context.vars['lat'] = parseFloat(context.vars['lat']) + Math.random()/100;
    context.vars['lng'] = parseFloat(context.vars['lng']) + Math.random()/100;
    context.vars['speed'] = parseFloat(context.vars['speed']);
    var d = new Date();
    context.vars['timestamp'] = d.toString();
    
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