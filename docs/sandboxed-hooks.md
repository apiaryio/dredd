# Sandboxed Hooks
Sandboxed hooks cen be used for running untrusted hook code. In each hook file you can use following functions:

`before(transcactionName, function)`

`after(transactionName, function)`

`beforeAll(function)`

`afterAll(function)`

`beforeEach(function)`

`afterEach(function)`


- [Transasction]() object is passed as a first argument to the hook function.
- Sandboxed hooks doesn't have asynchronous API. Loading of hooks and each hook is ran in it's own isolated, sandboxed context.
- Hook maximum execution time is 500ms.
- Memory limit is 1M
- Inside each hook you can access `stash` object variable which is passed between contexts of each hook function execution.
- Hook code is evaluated as `use strict`
- Sandboxed mode does not support CoffeScript hooks


## Examples

## CLI switch

```
$ dredd blueprint.md http://localhost:3000 --hokfiles path/to/hookfile.js --sandbox
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

dred.run(function(error, stats){
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
  newBody[id] = stash['id'];
  transasction.request.body = JSON.stringify(newBody);
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
  newBody[id] = myObject['id'];
  transasction.request.body = JSON.stringify(newBody);
})

```

This will explode with: `ReferenceError: myOjcet is not defined`


