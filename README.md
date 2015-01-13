bitcoind-rpc.js
===============

A client library to connect to Bitcoin Core RPC in JavaScript.

## Get Started

bitcoind-rpc.js runs on [node](http://nodejs.org/), and can be installed via [npm](https://npmjs.org/):

```bash
npm install bitcoind-rpc
```

## Examples

Some examples are provided at the [examples](/examples) path. Here are some snippets:

```javascript

var run = function() {
  var RpcClient = require('bitcoind-rpc');
  var hash = '0000000000b6288775bbd326bedf324ca8717a15191da58391535408205aada4';

  var config = {
    protocol: 'http',
    user: 'user',
    pass: 'pass',
    host: '127.0.0.1',
    port: '18332',
  };

  var rpc = new RpcClient(config);

  rpc.getBlock(hash, function(err, ret) {
    if (err) {
      console.error('An error occured fetching block', hash);
      console.error(err);
      return;
    }
    console.log(ret);
  });
};

```

## License

**Code released under [the MIT license](https://github.com/bitpay/bitcore/blob/master/LICENSE).**

Copyright 2013-2014 BitPay, Inc.
