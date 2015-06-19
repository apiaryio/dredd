# Hook Scripts

Similar to any other testing framework, Dredd supports executing code around each test step.
Hooks are code blocks executed in defined stage of [execution lifecycle](usage.md#dredd-execution-lifecycle).
In the hooks code you have an access to compiled HTTP [transaction object](#transaction-object-structure) which you can modify.

Hooks are usually used for:

- loading db fixtures
- cleanup after test step or steps
- handling authentication and sessions
- passing data between transactions (saving state from responses to _stash_)
- modifying request generated from blueprint
- changing generated expectations
- setting custom expectations
- debugging via logging stuff

## Using Hook Files

To use a hook file with Dredd, use the `--hookfiles` flag in the command line.
You can use this flag multiple times or use a [glob](http://npmjs.com/package/glob) expression for loading multiple hook files.

Example:

```sh
$ dredd single_get.md http://machines.apiary.io --hookfiles=*_hooks.*
```

## Getting Transaction Names

Dredd uses the __transaction names__ of the compiled HTTP transactions (_actions_) from the API Blueprint for addressing specific test steps.
In order to do that (retrieve transaction names) please run Dredd with the `--names` argument last and it will print all available names of transactions.
For example, given an API Blueprint file `blueprint.md` as following:

```markdown
FORMAT: 1A

# Machines API

# Group Machines

# Machines collection [/machines]

## Get Machines [GET]

- Response 200 (application/json; charset=utf-8)

    [{"type": "bulldozer", "name": "willy"}]

```

Run this command to retrieve all transaction names:

```sh
$ dredd single_get.md http://machines.apiary.io --names
info: Machines > Machines collection > Get Machines
```

The `Machines > Machines collection > Get Machines` is the name of a transaction which you can use in your hooks.
See [Hooks JavaScript API Reference](#hooks-javascript-api-reference) for broader information of how is it used.

## Types of Hooks

Dredd supports following types of hooks:

- `beforeAll` called at the beginning of the whole test run
- `beforeEach` called before each HTTP transaction
- `before` called before some specific HTTP transaction
- `after` called after some specific HTTP transaction regardless its result
- `afterEach` called after each HTTP transaction
- `afterAll` called after whole test run

## Hooks JavaScript API Reference

- For `before`, `after`, `beforeEach`, and `afterEach`, a [Transaction Object](#transaction-object-structure) is passed as the first argument to the hook function.
- An array of Transaction Objects is passed to `beforeAll` and `afterAll`.
- The second argument is an optional callback function for async execution.
- Any modifications on the `transaction` object is propagated to the actual HTTP transactions.
- You can use `hooks.log` function inside the hook to print yours debug messages and informations.

### Sync API

```javascript
var hooks = require('hooks');

hooks.beforeAll(function (transactions) {
  hooks.log('beforeAll');
});

hooks.beforeEach(function (transaction) {
  hooks.log('beforeEach');
});

hooks.before("Machines > Machines collection > Get Machines", function (transaction) {
  hooks.log("before");
});

hooks.after("Machines > Machines collection > Get Machines", function (transaction) {
  hooks.log("after");
});

hooks.afterEach(function (transaction) {
  hooks.log('afterEach');
});

hooks.afterAll(function (transactions) {
  hooks.log('afterAll');
})
```

### Async API

When the callback is used in the hook function, callbacks can handle asynchronous function calls.

```javascript
var hooks = require('hooks');

hooks.beforeAll(function (transactions, done) {
  hooks.log('beforeAll');
  done();
});

hooks.beforeEach(function (transaction, done) {
  hooks.log('beforeEach');
  done();
});

hooks.before("Machines > Machines collection > Get Machines", function (transaction, done) {
  hooks.log("before");
  done();
});

hooks.after("Machines > Machines collection > Get Machines", function (transaction, done) {
  hooks.log("after");
  done();
});

hooks.afterEach(function (transaction, done) {
  hooks.log('afterEach');
  done();
});

hooks.afterAll(function (transactions, done) {
  hooks.log('afterAll');
  done();
})
```

### Transaction Object Structure

Transaction object is used as a first argument for hook functions.
Following is description is in a [MSON](https://github.com/apiaryio/mson) format

- transaction (object)
    - name: `"Hello, world! > Retrieve Message"` (string) Transaction identification name used for referencing
    - host: `"localhost"` (string) hostname without port
    - port: `3000` (number)
    - protocol: `"https:"` (string)
    - fullPath: `"/message"` (string) expanded URI-Template with parameters (if any) used for the real HTTP(s) request

    - request (object) Request compiled from blueprint
        - body `"Hello world!\n"` (string)
        - headers (object)
        - uri `"/message"` (string) informative uri about the request
        - method

    - expected (object) Expected response from blueprint
        - statusCode `"200"` (string)
        - headers (object)
        - body (string)

    - real (object) System under test response data. Present only in `after` hook.
        - statusCode `"200"` (string)
        - headers (object)
        - body (string)

    - origin (object)  Reference to the original blueprint
        - filename `"./blueprint.md"` (string)
        - apiName `"My Api"` (string)
        - resourceGroupName `"Greetings"` (string)
        - resourceName `"Hello, world!"` (string)
        - actionName `"Retreive Message"` (string)
        - exampleName `"First example"` (string)

    - skip `false` (boolean) Set to `true` to skip this transcition
    - fail `false` (boolean/string) Set to `true` or string with message and transaction will result in fail

    - test (object) Result of [Gavel][] validation, same object is passed to reporters
        - status `"fail"` (string) Test status - phase
        - start `"2015-03-19T00:58:32.796Z"` (string) Start time in [UTC ISO 8601][]
        - valid `false` (boolean) Test result

    - results (object) Results from [Gavel][] in it's format
        - version `"2"` (string) Gavel Validation version
        - statusCode (object) Validation results for status code
        - headers (object) Validation results for headers
        - body (object) Validation results for body

[UTC ISO 8601]: http://wikipedia.org/wiki/ISO_8601
[Gavel]: https://www.relishapp.com/apiary/gavel/docs

### How to Skip Tests

Any test step can can be skipped by setting `skip` property of the `transaction` object to `true`.

```javascript
var before = require('hooks').before;

before("Machines > Machines collection > Get Machines", function (transaction) {
  transaction.skip = true;
});
```

### Sharing Data Between Steps in Request Stash

You may pass data between test steps using the response stash.

```javascript
var hooks = require('hooks');
var before = hooks.before;
var after = hooks.after;

var responseStash = {};

after("Machines > Machines collection > Create Machine", function (transaction) {

  // saving HTTP response to the stash
  responseStash[transaction.name] = transaction.real;
});


before("Machines > Machine > Delete a machine", function (transaction) {
  //reusing data from previouse response here
  machineId = JSON.parse(requestStash['Machines > Machines collection > Create Machine'])['id'];

  //replacing id in url with stashed id from previous response
  url = transaction.fullPath;
  transaction.fullPath = url.replace('42', machineId);
});
```

### Failing Tests Programmatically

You can fail any step by setting `fail` property on `transaction` object to `true` or any string with descriptive message.

```javascript
var before = require('hooks').before;

before("Machines > Machines collection > Get Machines", function (transaction) {
  transaction.fail = "Some failing message";
});
```

### Using Chai Assertions

Inside hook files, you can require [Chai](http://chaijs.com/) and use its `assert`, `should` or `expect` interface in hooks and write your custom expectations. Dredd catches Chai's expectation error in hooks and makes transaction to fail.

```javascript
var hooks = require('hooks');
var before = hooks.before;
var assert = require('chai').assert;

after("Machines > Machines collection > Get Machines", function (transaction) {
  assert.isBelow(transaction.real.body.length, 100);
});
```

## Sandbox Mode

The Sandbox mode can be used for running untrusted hook code. It can be activated with a CLI switch or with the JS API.
In each hook file you can use following functions:

`before(transactionName, function)`

`after(transactionName, function)`

`beforeAll(function)`

`afterAll(function)`

`beforeEach(function)`

`afterEach(function)`

`log(string)`

- A [Transaction Object](#transaction-object-structure) is passed as a first argument to the hook function for `before`, `after`, `beforeEach`, and `afterEach`.
- An array of Transaction Objects is passed to `beforeEach` and `afterEach`.
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

### CLI Switch

Sandboxed hooks may be used with the `--sandbox` argument on the command line.

```shell
$ dredd blueprint.md http://localhost:3000 --hookfiles path/to/hookfile.js --sandbox
```

### JS API Option

Dredd can be configured in JavaScript

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

When sandboxed, hook function context is not shared between step hook functions.

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

## Advanced Hook Examples

### Modifying Transaction Request Body Prior to Execution

```javascript
var hooks = require('hooks');
var before = hooks.before;

before("Machines > Machines collection > Get Machines", function (transaction) {
  // parse request body from blueprint
  requestBody = JSON.parse(transaction.request.body);

  // modify request body here
  requestBody['someKey'] = 'someNewValue';

  // stringify the new body to request
  transaction.request.body = JSON.stringify(requestBody);
});
```

### Adding or Changing URI Query Parameters to All Requests

```javascript
var hooks = require('hooks');

hooks.beforeEach(function (transaction) {
  // add query parameter to each transaction here
  var paramToAdd = "api-key=23456"
  if(transaction.fullPath.indexOf('?') > -1){
    transaction.fullPath += "&" + paramToAdd;
  } else{
    transaction.fullPath += "?" + paramToAdd;
  }
});
```

### Handling sessions

```javascript
hooks = require('hooks');
stash = {}

// hook to retrieve session on a login
hooks.after('Auth > /remoteauth/userpass > POST', function (transaction) {
  stash['token'] = JSON.parse(transaction.real.body)['sessionId'];
});

// hook to set the session cookie in all following requests
hooks.beforeEach(function (transaction) {
  if(stash['token'] != undefined){
    transaction.request['headers']['Cookie'] = "id=" + stash['token'];
  };
});
```
