# JavaScript Hooks In Sandbox Mode

## Usage

```
$ dredd apiary.apib http://localhost:3000 --sandbox --hookfiles=./hooks*.js
```

### Dredd JS API Option

Sandbox mode can be enabled in Dredd JavaScript API

```javascript
var Dredd = require('dredd');
var configuration = {
  server: "http://localhost",
  options: {
    path: "./test/fixtures/single-get.apib",
    sandbox: true,
    hookfiles: ['./test/fixtures/sandboxed-hook.js']
  }
};
var dredd = new Dredd(configuration);

dredd.run(function (error, stats) {
  // your callback code here
});
```

## Sandboxed JavaScript Hooks API reference

The Sandbox mode can be used for running untrusted hook code. It can be activated with a CLI switch or with the JS API.
In each hook file you can use following functions:

`beforeAll(function)`

`beforeEach(function)`

`before(transactionName, function)`

`beforeEachValidation(function)`

`beforeValidation(transactionName, function)`

`after(transactionName, function)`

`afterEach(function)`

`afterAll(function)`

`log(string)`

- A [Transaction Object](#transaction-object-structure) is passed as a first argument to the hook function for `before`, `after`, `beforeEach`, `afterEach`, `beforeValidation` and `beforeEachValidation`.
- An array of Transaction Objects is passed to `beforeAll` and `afterAll`.
- Sandboxed hooks don't have an asynchronous API. Loading and running of each hook happens in it's own isolated, sandboxed context.
- Hook maximum execution time is 500ms.
- Memory limit is 1M
- You can access global `stash` object variables in each separate hook file.
  `stash` is passed between contexts of each hook function execution.
  This `stash` object purpose is to allow _transportation_ of user defined values
  of type `String`, `Number`, `Boolean`, `null` or `Object` and `Array` (no `Functions` or callbacks).
- Hook code is evaluated with `"use strict"` directive - [details at MDN](https://mdn.io/use+strict)
- Sandboxed mode does not support hooks written in CoffeScript language
- You can print to console (via Dredd's logger) with `log` function, taking into account the used logging level `--level` option (levels: `error > warn > hook > info`)


### Request Stash in Sandbox Mode

```javascript
after('First action', function (transaction) {
  stash['id'] = JSON.parse(transaction.real.response);
});

before('Second action', function (transaction) {
  newBody = JSON.parse(transaction.request.body);
  newBody['id'] = stash['id'];
  transaction.request.body = JSON.stringify(newBody);
});
```

### Hook function context is not shared

When __sandboxed__, hook function __context is not shared__ between even the same step hook functions.

Note: __This is wrong__. It throws an exception.

```javascript
var myObject = {};

after('First action', function (transaction) {
  myObject['id'] = JSON.parse(transaction.real.response);
});

before('Second action', function (transaction) {
  newBody = JSON.parse(transaction.request.body);
  newBody['id'] = myObject['id'];
  transaction.request.body = JSON.stringify(newBody);
});
```

This will explode with: `ReferenceError: myObject is not defined`
