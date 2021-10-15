'use strict';

var http = require('http');
var https = require('https');
var url = require('url');

function decodeURL(str) {
  var parsedUrl = url.parse(str);
  var hostname = parsedUrl.hostname;
  var port = parseInt(parsedUrl.port, 10);
  var protocol = parsedUrl.protocol;
  // strip trailing ":"
  protocol = protocol.substring(0, protocol.length - 1);
  var auth = parsedUrl.auth;
  var parts = auth.split(':');
  var user = parts[0] ? decodeURIComponent(parts[0]) : null;
  var pass = parts[1] ? decodeURIComponent(parts[1]) : null;
  var opts = {
    host: hostname,
    port: port,
    protocol: protocol,
    user: user,
    pass: pass,
  };
  return opts;
}

function RpcClient(opts) {
  // opts can ba an URL string
  if (typeof opts === 'string') {
    opts = decodeURL(opts);
  }
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

  var userInfo = this.user + ':' + this.pass;
  var buf = (Buffer.from && Buffer.from !== Uint8Array.from) ? Buffer.from(userInfo) : new Buffer(userInfo);
  this.auth = buf.toString('base64');

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
  req.setHeader('Authorization', 'Basic ' + self.auth);
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
  analyzePSBT: 'str',
  backupWallet: '',
  bumpFee: 'str',
  clearBanned: '',
  combinePSBT: 'obj',
  combineRawTransaction: 'obj',
  convertToPSBT: 'str',
  createMultiSig: '',
  createPSBT: 'obj',
  createRawTransaction: 'obj obj',
  createWallet: 'str',
  decodePSBT: 'str',
  decodeScript: 'str',
  decodeRawTransaction: '',
  deriveAddresses: 'str',
  disconnectNode: '',
  dumpPrivKey: '',
  dumpWallet: 'str',
  encryptWallet: '',
  enumerateSigners: '',
  estimateFee: '', // deprecated
  estimateSmartFee: 'int str',
  estimatePriority: 'int', // deprecated
  generate: 'int', // deprecated
  generateBlock: 'str obj',
  generateToAddress: 'int str',
  generateToDescriptor: 'int str',
  getAccount: '', // deprecated
  getAccountAddress: 'str', // deprecated
  getAddedNodeInfo: '',
  getAddressMempool: 'obj', // deprecated
  getAddressUtxos: 'obj', // deprecated
  getAddressBalance: 'obj', // deprecated
  getAddressDeltas: 'obj', // deprecated
  getAddressesByLabel: 'str',
  getAddressInfo: 'str',
  getAddressTxids: 'obj', // deprecated
  getAddressesByAccount: '', // deprecated
  getBalance: 'str int',
  getBalances: '',
  getBestBlockHash: '',
  getBlockDeltas: 'str', // deprecated
  getBlock: 'str int',
  getBlockchainInfo: '',
  getBlockCount: '',
  getBlockFilter: 'str',
  getBlockHashes: 'int int obj', // deprecated
  getBlockHash: 'int',
  getBlockHeader: 'str',
  getBlockNumber: '', // deprecated
  getBlockStats: 'str',
  getBlockTemplate: '',
  getConnectionCount: '',
  getChainTips: '',
  getChainTxStats: '',
  getDescriptorInfo: 'str',
  getDifficulty: '',
  getGenerate: '', // deprecated
  getHashesPerSec: '', // deprecated
  getIndexInfo: '',
  getInfo: '', // deprecated
  getMemoryInfo: '',
  getMemoryPool: '', // deprecated
  getMemPoolAncestors: 'str',
  getMemPoolDescendants: 'str',
  getMemPoolEntry: 'str',
  getMemPoolInfo: '',
  getMiningInfo: '',
  getNetTotals: '',
  getNetworkHashPS: '',
  getNetworkInfo: '',
  getNewAddress: 'str str',
  getNodeAddresses: '',
  getPeerInfo: '',
  getRawChangeAddress: '',
  getRawMemPool: 'bool',
  getRawTransaction: 'str int',
  getReceivedByAccount: 'str int', // deprecated
  getReceivedByAddress: 'str int',
  getReceivedByLabel: 'str',
  getRpcInfo: '',
  getSpentInfo: 'obj',
  getTransaction: '',
  getTxOut: 'str int bool',
  getTxOutProof: '',
  getTxOutSetInfo: '',
  getUnconfirmedBalance: '',
  getWalletInfo: '',
  getWork: '',
  getZmqNotifications: '',
  finalizePSBT: 'str',
  fundRawTransaction: 'str',
  help: '',
  importAddress: 'str str bool',
  importDescriptors: 'str',
  importMulti: 'obj obj',
  importPrivKey: 'str str bool',
  importPrunedFunds: 'str, str',
  importPubKey: 'str',
  importWallet: 'str',
  invalidateBlock: 'str',
  joinPSBTs: 'obj',
  keyPoolRefill: '',
  listAccounts: 'int',
  listAddressGroupings: '',
  listBanned: '',
  listDescriptors: '',
  listLabels: '',
  listLockUnspent: 'bool',
  listReceivedByAccount: 'int bool',
  listReceivedByAddress: 'int bool',
  listReceivedByLabel: '',
  listSinceBlock: 'str int',
  listTransactions: 'str int int',
  listUnspent: 'int int',
  listWalletDir: '',
  listWallets: '',
  loadWallet: 'str',
  lockUnspent: '',
  logging: '',
  move: 'str str float int str',
  ping: '',
  preciousBlock: 'str',
  prioritiseTransaction: 'str float int',
  pruneBlockChain: 'int',
  psbtBumpFee: 'str',
  removePrunedFunds: 'str',
  reScanBlockChain: '',
  saveMemPool: '',
  send: 'obj',
  setHDSeed: '',
  setLabel: 'str str',
  setWalletFlag: 'str',
  scanTxOutSet: 'str',
  sendFrom: 'str str float int str str',
  sendMany: 'str obj int str',  //not sure this is will work
  sendRawTransaction: 'str',
  sendToAddress: 'str float str str',
  setAccount: '',
  setBan: 'str str',
  setNetworkActive: 'bool',
  setGenerate: 'bool int',
  setTxFee: 'float',
  signMessage: '',
  signMessageWithPrivKey: 'str str',
  signRawTransaction: '',
  signRawTransactionWithKey: 'str obj',
  signRawTransactionWithWallet: 'str',
  stop: '',
  submitBlock: 'str',
  submitHeader: 'str',
  testMemPoolAccept: 'obj',
  unloadWallet: '',
  upgradeWallet: '',
  uptime: '',
  utxoUpdatePSBT: 'str',
  validateAddress: '',
  verifyChain: '',
  verifyMessage: '',
  verifyTxOutProof: 'str',
  walletCreateFundedPSBT: '',
  walletDisplayAddress: 'str',
  walletLock: '',
  walletPassPhrase: 'string int',
  walletPassphraseChange: '',
  walletProcessPSBT: 'str'
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
    var spec = [];
    if (apiCalls[k].length) {
      spec = apiCalls[k].split(' ');
      for (var i = 0; i < spec.length; i++) {
        if(types[spec[i]]) {
          spec[i] = types[spec[i]];
        } else {
          spec[i] = types.str;
        }
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
