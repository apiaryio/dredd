# Sandboxed Hooks

Sandboxed hooks can be used for running untrusted hook code.
In each hook file you can use following functions:

`before(transactionName, function)`

`after(transactionName, function)`

`beforeAll(function)`

`afterAll(function)`

`beforeEach(function)`

`afterEach(function)`


- [Transaction]() object is passed as a first argument to the hook function.
- Sandboxed hooks don't have asynchronous API. Loading of hooks and each hook happens in it's own isolated, sandboxed context.
- Hook maximum execution time is 500ms.
- Memory limit is 1M
- Inside each hook you can access global `stash` object variable which is passed between contexts of each hook function execution. This `stash` object purpose is to allow _transportation_ of user defined values of type `String`, `Number`, `Boolean`, `null` or `Object` and `Array` (no `Functions` or callbacks).
- Hook code is evaluated with `"use strict"` directive - [details at MDN](https://mdn.io/use+strict)
- Sandboxed mode does not support hooks written in CoffeScript language


## Examples

## CLI switch

```
$ dredd blueprint.md http://localhost:3000 --hookfiles path/to/hookfile.js --sandbox
```

## JS API

```javascript
Dredd = require('dredd');
configuration = {
  server: "http://localhost",
  options: {
    path: "./test/fixtures/single-get.apib",
    sandbox: true,
    hookfiles: './test/fixtures/sandboxed-hook.js',
  }
};
dredd = new Dredd(configuration);

dredd.run(function(error, stats){
  // your callback code here
});
```


### Stashing example
```javascript

after('First action', function(transaction){
  stash['id'] = JSON.parse(transaction.real.response);
})

before('Second action', funciton(transaction){
  newBody = JSON.parse(transaction.request.body);
  newBody['id'] = stash['id'];
  transaction.request.body = JSON.stringify(newBody);
})

```


### Throwing an exception, hook function context is not shared
```javascript
var myObject = {};

after('First action', function(transaction){
  myObject['id'] = JSON.parse(transaction.real.response);
})

before('Second action', funciton(transaction){
  newBody = JSON.parse(transaction.request.body);
  newBody'[id'] = myObject['id'];
  transaction.request.body = JSON.stringify(newBody);
})

```

This will explode with: `ReferenceError: myObject is not defined`


