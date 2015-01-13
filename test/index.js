'use strict';

var chai = require('chai');
var RpcClient = require('../');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var sinon = require('sinon');

var should = chai.should();

describe('RpcClient', function() {

  it('should initialize the main object', function() {
    should.exist(RpcClient);
  });

  it('should be able to create instance', function() {
    var s = new RpcClient();
    should.exist(s);
  });

  function FakeResponse(){
    EventEmitter.call(this);
  }
  util.inherits(FakeResponse, EventEmitter);

  function FakeRequest(){
    EventEmitter.call(this);
    return this;
  }
  util.inherits(FakeRequest, EventEmitter);
  FakeRequest.prototype.setHeader = function() {};
  FakeRequest.prototype.write = function() {};
  FakeRequest.prototype.end = function() {};

  it('should call a method and receive response', function(done) {

    var client = new RpcClient('user', 'pass', {
      host: 'localhost',
      port: 8332,
      rejectUnauthorized: true,
      disableAgent: true
    });

    var requestStub = sinon.stub(client.protocol, 'request', function(options, callback){
      var res = new FakeResponse();
      setTimeout(function(){
        res.emit('data', '{}');
        res.emit('end');
      }, 100);
      callback(res);
      return new FakeRequest();
    });

    client.getDifficulty(function(error, parsedBuf) {
      should.not.exist(error);
      should.exist(parsedBuf);
      requestStub.restore();
      done();
    });

  });

  it('should handle connection rejected 401', function(done) {

    var client = new RpcClient('user', 'pass', {
      host: 'localhost',
      port: 8332,
      rejectUnauthorized: true,
      disableAgent: true
    });

    var requestStub = sinon.stub(client.protocol, 'request', function(options, callback){
      var res = new FakeResponse();
      res.statusCode = 401;
      setTimeout(function(){
        res.emit('end');
      }, 100);
      callback(res);
      return new FakeRequest();
    });

    client.getDifficulty(function(error, parsedBuf) {
      should.exist(error);
      error.message.should.equal('bitcoin JSON-RPC connection rejected: 401 unauthorized');
      requestStub.restore();
      done();
    });

  });

  it('should handle EPIPE error', function(done) {

    var client = new RpcClient('user', 'pass', {
      host: 'localhost',
      port: 8332,
      rejectUnauthorized: true,
      disableAgent: true
    });

    var requestStub = sinon.stub(client.protocol, 'request', function(options, callback){
      var res = new FakeResponse();
      res.statusCode = 401;
      setTimeout(function(){
        res.emit('data', '{}');
        res.emit('end');
      }, 100);
      var req = new FakeRequest();
      setTimeout(function(){
        req.emit('error', new Error('write EPIPE'));
      }, 50);
      callback(res);
      return req;
    });

    client.getDifficulty(function(error, parsedBuf) {
      should.exist(error);
      error.message.should.equal('Bitcoin Core RPC: write EPIPE');
      requestStub.restore();
      done();
    });

  });

});
