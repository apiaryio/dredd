# Writing Dredd Hooks In Node.js

## Usage

```
$ dredd apiary.apib http://localhost:30000 --hookfiles=./hooks*.js
```

## API Reference

- For `before`, `after`, `beforeValidation`, `beforeEach`, `afterEach` and `beforeEachValidation` a [Transaction Object](https://dredd.readthedocs.org/en/latest/hooks/#transaction-object-structure) is passed as the first argument to the hook function.
- An array of Transaction Objects is passed to `beforeAll` and `afterAll`.
- The second argument is an optional callback function for async execution.
- Any modifications on the `transaction` object are propagated to the actual HTTP transactions.
- You can use `hooks.log` function inside the hook function to print
  yours debug messages and other information.

- [`configuration`](https://dredd.readthedocs.org/en/latest/usage/#configuration-object-for-dredd-class) object is populated on the `hooks` object

### Sync API

```javascript
var hooks = require('hooks');

hooks.beforeAll(function (transactions) {
  hooks.log('before all');
});

hooks.beforeEach(function (transaction) {
  hooks.log('before each');
});

hooks.before("Machines > Machines collection > Get Machines", function (transaction) {
  hooks.log("before");
});

hooks.beforeEachValidation(function (transaction) {
  hooks.log('before each validation');
});

hooks.beforeValidation("Machines > Machines collection > Get Machines", function (transaction) {
  hooks.log("before validation");
});

hooks.after("Machines > Machines collection > Get Machines", function (transaction) {
  hooks.log("after");
});

hooks.afterEach(function (transaction) {
  hooks.log('after each');
});

hooks.afterAll(function (transactions) {
  hooks.log('after all');
})
```

### Async API

When the callback is used in the hook function, callbacks can handle asynchronous function calls.

```javascript
var hooks = require('hooks');

hooks.beforeAll(function (transactions, done) {
  hooks.log('before all');
  done();
});

hooks.beforeEach(function (transaction, done) {
  hooks.log('before each');
  done();
});

hooks.before("Machines > Machines collection > Get Machines", function (transaction, done) {
  hooks.log("before");
  done();
});

hooks.beforeEachValidation(function (transaction, done) {
  hooks.log('before each validation');
  done();
});

hooks.beforeValidation("Machines > Machines collection > Get Machines", function (transaction, done) {
  hooks.log("before validation");
  done();
});

hooks.after("Machines > Machines collection > Get Machines", function (transaction, done) {
  hooks.log("after");
  done();
});

hooks.afterEach(function (transaction, done) {
  hooks.log('after each');
  done();
});

hooks.afterAll(function (transactions, done) {
  hooks.log('after all');
  done();
})
```

# Examples

### How to Skip Tests

Any test step can be skipped by setting `skip` property of the `transaction` object to `true`.

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
  //reusing data from previous response here
  var machineId = JSON.parse(requestStash['Machines > Machines collection > Create Machine'])['id'];

  //replacing id in URL with stashed id from previous response
  var url = transaction.fullPath;
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

### Modifying Transaction Request Body Prior to Execution

```javascript
var hooks = require('hooks');
var before = hooks.before;

before("Machines > Machines collection > Get Machines", function (transaction) {
  // parse request body from blueprint
  var requestBody = JSON.parse(transaction.request.body);

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
var hooks = require('hooks');
var stash = {};

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


### Remove trailing newline character in expected _plain text_ bodies

```javascript
var hooks = require('hooks');

hooks.beforeEach(function(transaction) {
  if (transaction.expected.headers['Content-Type'] === 'text/plain') {
    transaction.expected.body = transaction.expected.body.replace(/^\s+|\s+$/g, "");
  }
});
```

### Using Babel

With this workaround you can use [Babel](https://babeljs.io/) for support of all the latest JS syntactic coolness in Dredd hooks:

```
npm install -g babel-cli babel-preset-es2015
echo '{ "presets": ["es2015"] }' > .babelrc
babel-node `which dredd` test/fixtures/single-get.apib http://localhost:3000 --hookfiles=./es2015.js
```





