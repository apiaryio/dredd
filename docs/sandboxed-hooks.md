# Sandboxed Hooks
Sandboxed hooks cen be used for running untrusted hook code. In each hook file you can use following functions:

`before(transcactionName, function)`
`after(transactionName, function)`
`beforeAll(function)`
`afterAll(function)`
`beforeEach(function)`
`afterEach(function)`

[Transasction]() object is passed as a first argument to the hook function. Sandboxed hooks doesn't have asynchronous API. Loading of hooks and each hook is ran in it's own isolated, sandboxed context. Hook maximum execution time is 500ms. Inside each hook you can access `stash` object variable which is passed between contexts of each hook function execution.

## Good
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


## Bad
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


