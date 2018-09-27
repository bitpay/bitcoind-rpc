'use strict';

var http = require('http');
var https = require('https');

function RpcClient(opts) {
  opts = opts || {};
  this.host = opts.host || '127.0.0.1';
  this.port = opts.port || 8332;
  this.user = opts.user || 'user';
  this.pass = opts.pass || 'pass';
  this.protocol = opts.protocol === 'http' ? http : https;
  this.batchedCalls = null;
  this.disableAgent  = opts.disableAgent || false;

  var isRejectUnauthorized = typeof opts.rejectUnauthorized !== 'undefined';
  this.rejectUnauthorized = isRejectUnauthorized ? opts.rejectUnauthorized : true;

  if(RpcClient.config.log) {
    this.log = RpcClient.config.log;
  } else {
    this.log = RpcClient.loggers[RpcClient.config.logger || 'normal'];
  }

}

var cl = console.log.bind(console);

var noop = function() {};

RpcClient.loggers = {
  none: {info: noop, warn: noop, err: noop, debug: noop},
  normal: {info: cl, warn: cl, err: cl, debug: noop},
  debug: {info: cl, warn: cl, err: cl, debug: cl}
};

RpcClient.config = {
  logger: 'normal' // none, normal, debug
};

function rpc(request, callback) {

  var self = this;
  request = JSON.stringify(request);
  var auth = new Buffer(self.user + ':' + self.pass).toString('base64');

  var options = {
    host: self.host,
    path: '/',
    method: 'POST',
    port: self.port,
    rejectUnauthorized: self.rejectUnauthorized,
    agent: self.disableAgent ? false : undefined
  };

  if (self.httpOptions) {
    for (var k in self.httpOptions) {
      options[k] = self.httpOptions[k];
    }
  }

  var called = false;

  var errorMessage = 'Bitcoin JSON-RPC: ';

  var req = this.protocol.request(options, function(res) {

    var buf = '';
    res.on('data', function(data) {
      buf += data;
    });

    res.on('end', function() {

      if (called) {
        return;
      }
      called = true;

      if (res.statusCode === 401) {
        callback(new Error(errorMessage + 'Connection Rejected: 401 Unnauthorized'));
        return;
      }
      if (res.statusCode === 403) {
        callback(new Error(errorMessage + 'Connection Rejected: 403 Forbidden'));
        return;
      }
      if (res.statusCode === 500 && buf.toString('utf8') === 'Work queue depth exceeded') {
        var exceededError = new Error('Bitcoin JSON-RPC: ' + buf.toString('utf8'));
        exceededError.code = 429; // Too many requests
        callback(exceededError);
        return;
      }

      var parsedBuf;
      try {
        parsedBuf = JSON.parse(buf);
      } catch(e) {
        self.log.err(e.stack);
        self.log.err(buf);
        self.log.err('HTTP Status code:' + res.statusCode);
        var err = new Error(errorMessage + 'Error Parsing JSON: ' + e.message);
        callback(err);
        return;
      }

      callback(parsedBuf.error, parsedBuf);

    });
  });

  req.on('error', function(e) {
    var err = new Error(errorMessage + 'Request Error: ' + e.message);
    if (!called) {
      called = true;
      callback(err);
    }
  });

  req.setHeader('Content-Length', request.length);
  req.setHeader('Content-Type', 'application/json');
  req.setHeader('Authorization', 'Basic ' + auth);
  req.write(request);
  req.end();
}

RpcClient.prototype.batch = function(batchCallback, resultCallback) {
  this.batchedCalls = [];
  batchCallback();
  rpc.call(this, this.batchedCalls, resultCallback);
  this.batchedCalls = null;
};

RpcClient.callspec = {
  abandonTransaction: 'str',
  abortRescan: '',
  addMultiSigAddress: '',
  addNode: '',
  backupWallet: '',
  bumpFee: 'str obj',
  clearBanned: '',
  combineRawTransaction: 'str',
  createMultiSig: '',
  createRawTransaction: 'obj obj',
  decodeRawTransaction: '',
  decodeScript: 'str',
  disconnectNode: 'str str',
  dumpPrivKey: 'str',
  dumpWallet: 'str',
  encryptWallet: 'str',
  estimateFee: 'int',
  estimateSmartFee: 'int str',
  fundRawTransaction: 'str obj',
  generate: 'int',
  generateToAddress: 'int str',
  getAccount: 'str',
  getAccountAddress: 'str',
  getAddedNodeInfo: '',
  getAddressesByAccount: 'str',
  getBalance: 'str int',
  getBestBlockHash: '',
  getBlock: 'str bool',
  getBlockchainInfo: '',
  getBlockCount: '',
  getBlockHash: 'int',
  getBlockHeader: 'str',
  getBlockTemplate: '',
  getChainTips: '',
  getChainTxStats: 'int str',
  getConnectionCount: '',
  getDifficulty: '',
  getMemoryInfo: 'str',
  getMemPoolAncestors: 'str',
  getMemPoolDescendants: 'str',
  getMemPoolEntry: 'str',
  getMemPoolInfo: '',
  getMiningInfo: '',
  getNetTotals: '',
  getNetworkHashps: 'int int',
  getNetworkInfo: '',
  getNewAddress: 'str str',
  getPeerInfo: '',
  getRawChangeAddress: 'str',
  getRawMemPool: 'bool',
  getRawTransaction: 'str int',
  getReceivedByAccount: 'str int',
  getReceivedByAddress: 'str int',
  getTransaction: 'str int',
  getTxOut: 'str int',
  getTxOutProof: 'obj str',
  getTxOutSetInfo: '',
  getUnconfirmedBalance: '',
  getWalletInfo: 'obj',
  help: '',
  importAddress: 'str str bool',
  importMulti: 'obj obj',
  importPrivKey: 'str str bool',
  importPrunedFunds: '',
  importPubKey: 'str bool',
  importWallet: 'str',
  keyPoolRefill: 'int',
  listAccounts: 'int bool',
  listAddressGroupings: '',
  listBanned: '',
  listLockUnspent: 'bool',
  listReceivedByAccount: 'int bool bool',
  listReceivedByAddress: 'int bool bool',
  listSinceBlock: 'str int bool bool',
  listTransactions: 'str int bool bool',
  listUnspent: 'int int obj bool obj',
  listWallets: '',
  lockUnspent: 'bool obj',
  logging: 'obj obj',
  move: 'str str float int str',
  ping: '',
  preciousBlock: 'str',
  prioritiseTransaction: 'str float int',
  pruneBlockchain: '',
  removePrunedFunds: 'str',
  rescanBlockchain: 'int int',
  saveMemPool: '',
  sendFrom: 'str str float int str str',
  sendMany: 'str obj int str',  //not sure this is will work
  sendRawTransaction: 'str bool',
  sendToAddress: 'str float str str',
  setAccount: 'str str',
  setBan: 'str str int bool',
  setNetworkActive: 'bool',
  setTxFee: 'float',
  signMessage: 'str str',
  signMessageWithPrivKey: 'str str',
  signRawTransaction: '',
  stop: '',
  submitBlock: 'str',
  uptime: '',
  validateAddress: 'str',
  verifyChain: 'int int',
  verifyMessage: 'str str str',
  verifyTxOutProof: 'str',
  walletLock: '',
  walletPassPhrase: 'string int',
  walletPassphraseChange: 'str str',
};

var slice = function(arr, start, end) {
  return Array.prototype.slice.call(arr, start, end);
};

function generateRPCMethods(constructor, apiCalls, rpc) {

  function createRPCMethod(methodName, argMap) {
    return function() {

      var limit = arguments.length - 1;

      if (this.batchedCalls) {
        limit = arguments.length;
      }

      for (var i = 0; i < limit; i++) {
        if(argMap[i]) {
          arguments[i] = argMap[i](arguments[i]);
        }
      }

      if (this.batchedCalls) {
        this.batchedCalls.push({
          jsonrpc: '2.0',
          method: methodName,
          params: slice(arguments),
          id: getRandomId()
        });
      } else {
        rpc.call(this, {
          method: methodName,
          params: slice(arguments, 0, arguments.length - 1),
          id: getRandomId()
        }, arguments[arguments.length - 1]);
      }

    };
  };

  var types = {
    str: function(arg) {
      return arg.toString();
    },
    int: function(arg) {
      return parseFloat(arg);
    },
    float: function(arg) {
      return parseFloat(arg);
    },
    bool: function(arg) {
      return (arg === true || arg == '1' || arg == 'true' || arg.toString().toLowerCase() == 'true');
    },
    obj: function(arg) {
      if(typeof arg === 'string') {
        return JSON.parse(arg);
      }
      return arg;
    }
  };

  for(var k in apiCalls) {
    var spec = apiCalls[k].split(' ');
    for (var i = 0; i < spec.length; i++) {
      if(types[spec[i]]) {
        spec[i] = types[spec[i]];
      } else {
        spec[i] = types.str;
      }
    }
    var methodName = k.toLowerCase();
    constructor.prototype[k] = createRPCMethod(methodName, spec);
    constructor.prototype[methodName] = constructor.prototype[k];
  }

}

function getRandomId() {
  return parseInt(Math.random() * 100000);
}

generateRPCMethods(RpcClient, RpcClient.callspec, rpc);

module.exports = RpcClient;
