'use strict';

var chai = require('chai');
var RpcClient = require('../');

var should = chai.should();

describe('RpcClient', function() {
  it('should initialze the main object', function() {
    should.exist(RpcClient);
  });
  it('should be able to create class', function() {
    should.exist(RpcClient);
  });
  it('should be able to create instance', function() {
    var s = new RpcClient();
    should.exist(s);
  });
});
