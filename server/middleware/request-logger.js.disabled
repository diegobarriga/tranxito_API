'use strict';

const fs = require('fs');
const util = require('util');

module.exports = function() {
  return function requestLogger(req, res, next) {
    fs.appendFile('request.log',
      'Path: ' + JSON.stringify(req.path) +
      ', Headers: ' + JSON.stringify(req.headers) +
      ', Body: ' + JSON.stringify(req.body) +
      ', Params: ' + JSON.stringify(req.params) +
      ', Query: ' + JSON.stringify(req.query) +
      ', Timestamp: ' + Date(Date.now()) + '\n',
        (err) => {
          if (err) throw err;
        });
    next();
  };
};
