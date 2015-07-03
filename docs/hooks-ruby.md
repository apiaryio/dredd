# Writing Dredd Hooks In Ruby

## Installation

```
$ gem install dredd_hooks
```

## Usage

```
$ dredd apiary.apib http://localhost:3000 --language ruby --hookfiles=./hooks*.rb
```

## API Reference


## Exapmles


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


### Remove traling newline character for in expected plain text bodies

```javascript
var hooks = require('hooks');

hooks.beforeEach(function(transaction) {
    if (transaction.expected.headers['Content-Type'] === 'text/plain') {
        transaction.expected.body = transaction.expected.body.replace(/^\s+|\s+$/g, "");
    }
});
```