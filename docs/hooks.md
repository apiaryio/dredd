# Dredd Hooks documentation

Dredd can load JavaScript or CoffeeScript files and process them.
The interface to communicate and actually use hooks is achieved through
requiring virtual `hooks` dependency provided by Dredd.

------

## Getting transaction names

You'd need __names__ of your transactions (_actions_) before proceeding further.
In order to do that please run Dredd with the `--names` argument as the last one
and it'll print all available names of transactions.

If you have an API Blueprint in `single_get.md` file, you can retrieve all
transaction names like this:

```sh
$ dredd single_get.md http://machines.apiary.io --names
info: Machines > Machines collection > Get Machines
```

## To run Dredd with hooks

Dredd uses [glob](http://npmjs.com/package/glob) when searching for files.
So you can use wildcard(s) to traverse the file tree and read files with your hooks.

**Example:** Run validation with hooks from file names ending with `_hooks` without extensions:

```sh
dredd single_get.md http://machines.apiary.io --hookfiles=*_hooks.*
```

## Hook types: `before`, `after`, `beforeAll`, `afterAll`

Dredd provides four types of hooks. _Single transaction hooks_ or _all transactions hooks_.

You must provide __transaction name__ in order to tell what function the
__single transaction hook__ should be called upon.
The first argument is a _string_ (transaction name), second argument is
the _function_.

If you use __all transactions hooks__, please use only one argument–the actual function.

- `__before__` hooks are called before every single transaction
- `__after__` hooks are called after every single transaction,
  regardless its success or failure status
- `__beforeAll__` hooks are called at the beginning of the whole test
- `__afterAll__` hooks are called after all transactions have set their end status


### Hook types examples

Let's have an example hookfile `machines_hooks.coffee`:

```coffee
{before, after} = require 'hooks'

before "Machines > Machines collection > Get Machines", (transaction) ->
  console.log "before"

after "Machines > Machines collection > Get Machines", (transaction) ->
  console.log "after"
```

Usage of asynchronous `beforeAll` and `afterAll` hooks:

```coffee
{beforeAll, afterAll, transactions} = require 'hooks'

beforeAll (done) ->
  # do setup
  done()

afterAll (done) ->
  # do teardown
  done()
```

If `beforeAll` and `afterAll` are called multiple times, the callbacks
are executed serially (in the order hook files were loaded from filesystem).

All compiled `transactions` are populated in `hooks` module object, so you can work with them in `beforeAll` hook

## Synchronous vs. Asynchronous hook

Hooks can be executed both synchronously and asynchronously. __Hook is a function__. 

First argument received in hook function is always a transaction object and it __must__ be defined in the function arguments.

__Optional__ second argument for the hook function is a __callback__.


More about the `transaction` object can be found in [transaction object documentation](docs/transaction.md).

```coffee
{before} = require 'hooks'

before 'Machines > Machines collection > Get Machines', (transaction, callback) {
  // ... your own asynchronous task here
  // ...
  // ..
  // once finished, just call callback
  callback();
}
```


## Fail or Skip a transaction inside a hook

Transaction can be skipped or failed. Just set the appropriate property.

Skipping a validation with hooks:

```coffee
before "Machines > Machines collection > Get Machines", (transaction) ->
  transaction.skip = true
```

Failing a validation with hooks:

```coffee
{before} = require 'hooks'
before "Machines > Machines collection > Get Machines", (transaction) ->
  transaction.fail = "Some failing message"
```

## Using Chai Expectations to fail a transaction
Dredd catches Chai's expectation errors in hooks and makes transaction fail

```coffee
{before} = require 'hooks'
after "Machines > Machines collection > Get Machines", (transaction) ->
  parsedResponse = JSON.parse transaction.actual.body
  assert.isAbove parsedResponse.itemsCount, 10
```

## Advanced Examples

You can also require [Chai](http://chaijs.com/) and use its assertions in
before/after hooks and it'll determine if the transaction is or isn't failing:

```coffee
{before, after} = require 'hooks'
{assert} = require 'chai'

after "Machines > Machines collection > Get Machines", (transaction) ->
  assert.isBelow transaction.real.body.length, 100
```


### Append Query Parameter to every URL

```coffee
hooks = require 'hooks'

# workaround helper for "before each" hooks
hooks._beforeEach = (hookFn) ->
  hooks.beforeAll (done) ->
    for transactionKey, transaction of hooks.transactions or {}
      hooks.beforeHooks[transaction.name] ?= []
      hooks.beforeHooks[transaction.name].unshift hookFn
    done()

hooks._beforeEach (transaction) ->
  # add query parameter to each transaction here
  paramToAdd = "foo=bar"
  if transaction.fullPath.indexOf('?') > -1
    transaction.fullPath += "&" + paramToAdd
  else
    transaction.fullPath += "?" + paramToAdd
```


### Using OAuth

Let's say you have installed the [oauth](http://www.npmjs.org/package/oauth) package.
And also you have a function to retrieve the token from the OAuth provider
of your choice somewhere inside your custom hook.

```javascript
var OAuth2 = OAuth.OAuth2;

// your twitter application
var twitterConsumerKey = process.env.TWITTER_CONSUMER_KEY;
var twitterConsumerSecret = process.env.TWITTER_CONSUMER_SECRET;

retrieveOauth2Token = function(callback) {
  var oauth2 = new OAuth2(
    yourTwitterConsumerKey,
    yourTwitterConsumerSecret,
    'https://api.twitter.com/',
    null, 'oauth2/token', null
  );
  oauth2.getOAuthAccessToken('',
    {'grant_type':'client_credentials'},
    function (e, access_token, refresh_token, results){
      callback("bearer:" + access_token);
  });
}

var hooks = require("hooks");
var retrievedPlaintextToken = '';
hooks.beforeAll(function(done) {
  if (retrievedPlaintextToken) {
    return done();
  }
  else {
    retrieveOauth2Token(function(token){
      retrievedPlaintextToken = token;
      done();
    });
  }
});

```

This way you can retrieve the token. To actually use it as a query parameter,
you can use similar approach from the Append Query Parameter example above.

