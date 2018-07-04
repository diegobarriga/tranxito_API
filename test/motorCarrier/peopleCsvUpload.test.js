'use strict';
var app = require('../../server/server.js');
var supertest = require('supertest');
var superagent = require('superagent');
var api = supertest(app);
var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;
var bodyParser = require('body-parser');
app.use(bodyParser.json());
var authenticatedDriver = supertest.agent(app);
var authenticatedSupport = supertest.agent(app);
var authenticatedAdmin = supertest.agent(app);
var currentDriver, currentSupport, currentAdmin;

// Set up the data we need to pass to the login method
const supportPersonalCredentials = {
  email: 'fdiaz@gmail.com',
  password: '1234',
};

const driverCredentials = {
  email: 'pablo.sanchez@gmail.com',
  password: '1234',
};

const adminCredentials = {
  email: 'aflores@gmail.com',
  password: '1234',
};

before(function(done) {
  authenticatedDriver
  .post('/api/People/login')
  .set('Accept', 'application/json')
    .send(driverCredentials)
    .end(function(err, response) {
      if (err) throw err;
      app.models.Person.findById(response.body.userId, function(err, user) {
        if (err) throw err;
        currentDriver = user;
        currentDriver.accessToken = response.body.id;
        done();
      });
    });
});

before(function(done) {
  authenticatedSupport
  .post('/api/People/login')
  .set('Accept', 'application/json')
    .send(supportPersonalCredentials)
    .end(function(err, response) {
      if (err) throw err;
      app.models.Person.findById(response.body.userId, function(err, user) {
        if (err) throw err;
        currentSupport = user;
        currentSupport.accessToken = response.body.id;
        done();
      });
    });
});

before(function(done) {
  authenticatedAdmin
  .post('/api/People/login')
  .set('Accept', 'application/json')
    .send(adminCredentials)
    .end(function(err, response) {
      if (err) throw err;
      app.models.Person.findById(response.body.userId, function(err, user) {
        if (err) throw err;
        currentAdmin = user;
        currentAdmin.accessToken = response.body.id;
        done();
      });
    });
});

describe('POST MotorCarriers/:id/people/csvUpload', function() {
  it('Should get duty status aggregated times for the motor carrier' +
    ' specified', function(done) {
    console.log(__dirname + '/../files/drivers.csv');
    authenticatedSupport.post('/api/MotorCarriers/' +
      currentSupport.motorCarrierId + '/people/csvUpload/?access_token=' +
      currentSupport.accessToken)
    .field('Content-Type', 'multipart/form-data')
    .attach('file', __dirname + '/../files/drivers.csv')
    .expect(200)
    .end(function(err, response) {
      if (err) throw err;
      done();
    });
  });
});
