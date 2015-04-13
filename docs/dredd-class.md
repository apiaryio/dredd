# Dredd — HTTP API Testing framework

[![Build Status](https://travis-ci.org/apiaryio/dredd.png?branch=master)](https://travis-ci.org/apiaryio/dredd)
[![Dependency Status](https://david-dm.org/apiaryio/dredd.png)](https://david-dm.org/apiaryio/dredd)
[![devDependency Status](https://david-dm.org/apiaryio/dredd/dev-status.png)](https://david-dm.org/apiaryio/dredd#info=devDependencies)
[![Coverage Status](https://coveralls.io/repos/apiaryio/dredd/badge.png?branch=master)](https://coveralls.io/r/apiaryio/dredd?branch=master)
[![Join the chat at https://gitter.im/apiaryio/dredd](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/apiaryio/dredd?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![NPM](https://nodei.co/npm/dredd.png)](https://nodei.co/npm/dredd/)


Dredd is a command-line tool for validating  API documentation written in [`API Blueprint`][] format and testing its backend implementation. 

Dredd **improves developer experience**, because  you can easily plug your API documentation into the Continous Integration system like [Travis CI][] or [Jenkins][] and have **API documentation up-to-date, all the time**. 

Dredd **generates [automatic expectations][]** with use of  [Gavel][] for judging if a particular API response is valid or if it isn't. 

Dredd is an open-source software made by [Apiary][].

![Dredd API Blueprint testing tool](https://raw.github.com/apiaryio/dredd/master/img/Dredd.png)

[Dredd][], [API blueprint][] and [Apiary][] cover complete API development lifecycle
- Design
- Local test-driven development
- Continuous integration
- Post-deployment live checks in continuous delivery

## Getting started testing your API
0. I you don't have [Node.js](https://nodejs.org/) installed, you may want to use [NVM](https://github.com/creationix/nvm)
1. Create an API blueprint in `blueprint.md`
2. Install Dredd
```
$ npm install -g dredd
```
3. Run interactive configuration:
```
$ dredd init
```
4. Run dredd
```
$ dredd
```

## Automatic expectations

Dredd automatically generates expectations on HTTP responses based on examples in the blueprint with use of [Gavel.js][https://github.com/apiaryio/gavel.js] library. Please refer to [Gavel](https://www.relishapp.com/apiary/gavel/docs) rules if you want know more.

**Remember:**  You can easily write additional [custom imperative expectations][] in hooks.

###Headers expectations

- All headers given in example must be present in the response
- Only values of headers significant for content negotiation are validated
- All other headers values can differ.

### Body expectations
- All JSON keys on any level given in the example must be present in the response JSON
- Response JSON values must be of same JSON primitive type
- All JSON values can differ
- Arrays can have additional items, type or structure is not valdated.
- Plain text must match perectly
- If JSON Schema v4 or JSON Schema v3 is given in the blueprint, JSON response must be valid against this schema nd JSON example is ignored.


## Example API backend application

This is an example how to create a simple [Express.js][] API backend applicatoin tested with Dredd

- Create a new documentation file in [API Blueprint][] format in `blueprint.md`

```
# GET /
+ Response 200 (application/json; charset=utf-8)

      {"message": "Hello World!"}
```

- Install [Express.js][]

```sh
$ npm install express
```

Create file with backend application in `app.js`:

```javascript
var app = require('express')();

app.get('/', function (req, res) {
  res.json({message: 'Hello World!'});
})

var server = app.listen(3000);
```

- Run the API application on background:

```sh
$ node app.js &
```

Finally, run Dredd for validation:

```sh
$ dredd blueprint.md http://localhost:3000
```

For more complex examples applications , please refer to:
- [Express.js example application](http://github.com/apiaryio/dredd-example)
- [Ruby on Rails example application](https://github.com/theodorton/dredd-test-rails)

##Using Apiary Test Inspector
Command-line output of complex HTTP responses and expectation can be hard to read. Dredd can send test reports to Apiary and Apiary provides an interface for browsing them. To enable it use argument `--reporter apiary`.

### Saving under your account in Apiary
Reports are anonymouse by default, but you can let Apiary save them under your API in Apiary by specifying Apiary Key and API Name with arguments
`-c apiaryApiKey:yourApiKey -c apiaryApiName:yourapiname` This is great for introspecting reports from Continous integration.

!!!!!!!!!   Screenshot image !!!!!!!! 

##Testing API Documentation

###Documentation testability

API Blueprint allows usage of URI templates. If you want to have API documentation to be complete and testable, do not forget to describe all URI used parameters and provide examples to make Dredd able to expand URI templates with given example values.

### Isolation

API Blueprint structure conforms to the REST paradigm, so in the API Blueprint are documented Resources and their Actions.

It's very likely that your blueprint will not be testable as-is, because actions in the reference will not be sorted in proper order for API's application logic workflow.

Proper testing of API documentation with Dredd is all about isolating each resource action with [hook][] scripts executing code before and after each HTTP transaction to do proper fixtures setup and teardown.

It's an analogy to **unit testing** of your code. In unit testing, each unit should be testable without any dependency on other units or previous tests.

> Each API action should be run in its **isolated context**.

### Example
It's usual that you discuss an action in the API documentation for some entity deletion before an action for re-using this deleted entity. For example in the API blueprint:
```
FORMAT: 1A

# Categories API

## Categories [/categories]

### Create a category [POST]
+ Response 201

## Category [/category/{id}]
+ Parameters
  + id (required, `42`)
 
### Delete a category [DELETE]
+ Response 204

## Category Items [/category/{id}/items]
+ Parameters
  + id (required, `42`)
  
## Create an item [POST]
+ Response 201
```

In this case, you will have to write a `before` hook for adding a database fixture creating a category executed before HTTP call to action creating item in this category.

First, retreive transaction names with:
```
dredd blueprint.md localhost:3000 --names
info: Categories > Create a category
info: Category > Delete a category
info: Category Items > Create an item
```

Now, create a `dreddhooks.js` with a pseudo `db` adapter:
```
db = require('db');
hooks = require('hooks');
beforeAll( function() {
  db.cleanUp();
});

afterEach( function() {
  db.cleanUp();
});

before('Category > Delete a category', function(){
  db.createCategory({id:42});
});

before('Category Items > Create an item', function(){
  db.createCategory({id:42});
});
```

##Testing API Workflows

If you want to test some sequence of HTTP steps (workflow or scenario) in you API apart of your API reference. Or a non RESTful API HTTP workflow, you can run Dredd with multiple blueprints by adding  `--path` argument

Unlike API reference testing, scenarios or workflows steps are in **shared context**, so you may want to [pass data between transcations][].

### Exapmle 

Having following workfow blueprint:
```
FORMAT: 1A

# My scenario

## POST /login

+ Request (application/json)

        {  "username": "john",  "password":"d0e" }


+ Response 200 (application/json)
  
        { "token": "s3cr3t"  }

## GET /cars

+ Response 200 (application/json)

        [ { "id": "42", "color": "red"} ]

## PATCH /cars/{id}
+ Parameters
  + id (string,required, `1`)

+ Request

        { color": "yellow" }

+ Response 200

        [  { "id": 42, "color": "yellow" } ]
        
```

Retreive transcation names with:
```
$ dredd blueprint.md localhost:3000 --names
info: /login > POST
info: /cars > GET
info: /cars/{id} > PATCH
```

Create a `dredhooks.js` file: 
```
db = require('db');
hooks = require('hooks');
stash = {}

// stash a retreived token
after('/login > POST', function(transaction){
  stash['token'] = JSON.parse(transaction.real.body)['token'];
});

//add token to all HTTP transcations
beforeEach(function(transaction){
  if(stash['token'] != undefined){
    transcation['headers']['X-Api-Key'] = stash['token']
  };
});

//stash returned car ID
after('/cars > GET', function(transaction){
  stash['carId'] = JSON.parse(transaction.real.body)['id'];
});

//replace car ID in request for Car resource modification
before('/cars/{id} > PATCH', function(transaction){
  transaction.request.url = transaction.request.url.replace('42', stas['carId'])
})
``` 

## Adding Dredd to an existing test suite
Generally, if you want to add Dredd to your existing test suite, you can just save Dredd configuration to the `dredd.yml` and add call for `dredd` command to your task runner.

In some eco-systems, there is native support for adding Dredd to the 
- [grunt-dredd](https://github.com/mfgea/grunt-dredd) a grunt task wrapper
- [dredd-rack]( https://github.com/gonzalo-bulnes/dredd-rack) a rake task and rack wrapper


##Continuous integration
If you didn't make Dredd part to your testing suite which is run in Continuous integration. You can run `dredd init` which will generate a `dredd.yml` configuration file and modify or generat CI configuration. 

If you want to add Dredd to your build manually without use of `dredd.yml` configuration, just add following configuration to your build. 

Example `circle.yml` configuration file for CircleCI:
```
dependencies:
  pre:
    - npm install -g dredd
test:
  pre:
    - dredd bluprint.md http://localhost:3000
```

Example `travis.yml` configuration file for Travis CI:
```
before_install:
  - npm install -g dredd
before_script:
  - dredd
```

### Authenticated APIs

Using HTTP basic authentication with a CLI argument
```
--user user:password
```

If you don't want to add some header directly to the blueprint, you can add header to all requests from command line:
```
--headers "Authorization: Basic YmVuOnBhc3M="
```

Adding URL query parameter to all requests
  
Dredd supports all possible authentications of HTTP API like:
      - basic
      - digest
      - oauth 1.0a
      - oauth 2.0
      - adding csrf tokens
  

# Using hook scripts

Similar to any other testing framework, Dredd supports executing code around each test step. Hooks are usually used for:

- loading db fixtures
- cleanup after test steps
- passing data between transactions (saving state from responses)
- modifying request generated from blueprint
- changing generated expectations
- setting custom expectations


### Retrieve transaction names

You will need __names__ of compiled HTTP transactions (_actions_) for adressing specific test step.
In order to do that please run Dredd with the `--names` argument as the last one   and it'll print all available names of transactions.

Having an API Blueprint in `blueprint.md` file:

```
FORMAT: 1A

# Machines API

# Group Machines

# Machines collection [/machines]

## Get Machines [GET]

- Response 200 (application/json; charset=utf-8)

    [{"type": "bulldozer", "name": "willy"}]

```

Retrieve all transaction names:

```sh
$ dredd single_get.md http://machines.apiary.io --names
info: Machines > Machines collection > Get Machines
```

String `Machines > Machines collection > Get Machines` is a name of transaction which you can use for addressing in hooks.

###  Hook types

Dredd supports following hooks:

- `beforeAll` called at the beginning of the whole test run
- `beforeEach` called before each HTTP transaction
- `before` called before some specific HTTP transaction
- `after` called after some specific HTTP transaction regardless its result
- `beforeEach` called after each HTTP transaction
- `afterAll` called after whole test run


### How to use hooks

Hook are code blocks executed in defined stage of [execution lifecycle][] In the hooks code you have an access to compiled HTTP [transaction object][] which you can modify. Default path to hook file is `./dreddhooks.js` or `dredhooks.coffee`.

You can change this location of hookfiles by using a `--hoofiles` argument. You can use it multiple times or use a glob expression for loading multiple hook files.

Example: 
```sh
$ dredd single_get.md http://machines.apiary.io --hookfiles=*_hooks.*
```

## Hooks JS API reference

### Sync API

```
```

### Async API

```
```

### Skipping tests programatically
Any test step can can be skipped by setting `skip` property of the `transaction` object to `true`

Skipping a validation with hooks:

```javascript
var before = require('hooks').before;

before("Machines > Machines collection > Get Machines", function (transaction) {
  transaction.skip = true;
});
```

### Passing data between test steps (using request stash)



### Failing tests programatically
You can fail any step by setting `fail` property on `transaction` object to `true` or any string with descriptive message.

```javascript
var before = require('hooks').before;

before("Machines > Machines collection > Get Machines", function (transaction) {
  transaction.fail = "Some failing message";
});
```

### Using Chai assertions in JS hooks
Inside hook files, you can require [Chai](http://chaijs.com/) and use its `assert`, `should` or `expect` interface in hooks and write your custom expectations. Dredd catches Chai's expectation error in hooks and makes transaction to fail.

```javascript
var hooks = require('hooks');
var before = hooks.before;
var assert = require('chai').assert;

after("Machines > Machines collection > Get Machines", function (transaction) {
  assert.isBelow(transaction.real.body.length, 100);
});
```

## Modifying transactions before execution

Adding cookies and sessions
---------------------------

Sandboxed hooks
---------------

## Using multipart requests

## Multiple requests and responses under one action

## CLI interface
```
dredd --help
Usage:
  $ dredd init

Or:
  $ dredd <path or URL to blueprint> <api_endpoint> [OPTIONS]

Example:
  $ dredd ./apiary.md http://localhost:3000 --dry-run

Options:
  --dry-run, -y        Do not run any real HTTP transaction, only parse
                       blueprint and compile transactions.       [default: null]
  --hookfiles, -f      Specifes a pattern to match files with before/after
                       hooks for running tests                   [default: null]
  --sandbox, -b        Load and run non trusted hooks code in sandboxed
                       container                                [default: false]
  --server, -g         Run API backend server command and kill it after Dredd
                       execution. E.g. `rails server`            [default: null]
  --server-wait        Set delay time in seconds between running a server and
                       test run.                                    [default: 3]
  --init, -i           Run interactive configuration. Creates .dredd.yml
                       configuration file.                      [default: false]
  --custom, -j         Pass custom key-value configuration data delimited by a
                       colon. E.g. -j 'a:b'                        [default: []]
  --names, -n          Only list names of requests (for use in a hookfile). No
                       requests are made.                       [default: false]
  --only, -x           Run only specified transaction name. Can be used
                       multiple times                              [default: []]
  --reporter, -r       Output additional report format. This option can be used
                       multiple times to add multiple reporters. Options:
                       junit, nyan, dot, markdown, html, apiary.
                                                                   [default: []]
  --output, -o         Specifies output file when using additional file-based
                       reporter. This option can be used multiple times if
                       multiple file-based reporters are used.
                                                                   [default: []]
  --header, -h         Extra header to include in every request. This option
                       can be used multiple times to add multiple headers.
                                                                   [default: []]
  --sorted, -s         Sorts requests in a sensible way so that objects are not
                       modified before they are created. Order: CONNECT,
                       OPTIONS, POST, GET, HEAD, PUT, PATCH, DELETE, TRACE.
                                                                [default: false]
  --user, -u           Basic Auth credentials in the form username:password.
                                                                 [default: null]
  --inline-errors, -e  Determines whether failures and errors are displayed as
                       they occur (true) or agregated and displayed at the end
                       (false).
                                                                [default: false]
  --details, -d        Determines whether request/response details are included
                       in passing tests.
                                                                [default: false]
  --method, -m         Restrict tests to a particular HTTP method (GET, PUT,
                       POST, DELETE, PATCH). This option can be used multiple
                       times to allow multiple methods.
                                                                   [default: []]
  --color, -c          Determines whether console output should include colors.
                                                                 [default: true]
  --level, -l          The level of logging to output. Options: silly, debug,
                       verbose, info, warn, error.
                                                               [default: "info"]
  --timestamp, -t      Determines whether console output should include
                       timestamps.
                                                                [default: false]
  --silent, -q         Silences commandline output.
                                                                [default: false]
  --path, -p           Additional blueprint paths or URLs. Can be used multiple
                       times with glob pattern for paths.          [default: []]
  --help               Show usage information.
                                                                                
  --version            Show version number.
```
### `dredd.yml` configuration file

> Disclaimer: this is unstable feature:

Command-line interface uses `dredd.yml` confiuration file for persistent configuration. Its structure is same as [ Configuration object for Dredd Class][] 

Example dredd.yml configuration:
```
reporter: apiary
color:
  - "apiaryApiKey:yourSecretApiaryAPiKey"
  - "apiaryApiName:apiName"
dry-run: null
hookfiles: "dreddhooks.js"
sandbox: false
server: rails server
server-wait: 3
init: false
custom: {}
names: false
only: []
output: []
header: []
sorted: false
user: null
inline-errors: false
details: false
method: []
level: info
timestamp: false
silent: false
path: []
blueprint: apiary.apib
endpoint: "http://localhost:3000"
```
## JS interface

You can use Dredd from your JavaScript environment directly,
not only via [CLI](http://en.wikipedia.org/wiki/Command-line_interface).


```javascript
var Dredd = require('dredd');

var dredd = new Dredd(configuration);
```

Then you need to run the Dredd Testing. So do it.

```javascript
dredd.run(function(err, stats){
  // err is present if anything went wrong
  // otherwise stats is an object with useful statistics
});
```

As you can see, `dredd.run` is a function receiving another function as a callback.
Received arguments are `err` (error if any) and `stats` (testing statistics) with
numbers accumulated throughout the Dredd run.


### Configuration object for Dredd Class

Let's have a look at an example configuration first. (Please also see [options source](src/options.coffee) to read detailed information about the `options` attributes).

```javascript
{
  server: 'http://localhost:3000/api', // your URL to API endpoint the tests will run against
  options: {

    'path': [],       // Required Array if Strings; filepaths to API Blueprint files, can use glob wildcards

    'dry-run': false, // Boolean, do not run any real HTTP transaction
    'names': false,   // Boolean, Print Transaction names and finish, similar to dry-run

    'level': 'info', // String, log-level (info, silly, debug, verbose, ...)
    'silent': false, // Boolean, Silences all logging output

    'only': [],      // Array of Strings, run only transaction that match these names

    'header': [],    // Array of Strings, these strings are then added as headers (key:value) to every transaction
    'user': null,    // String, Basic Auth credentials in the form username:password

    'hookfiles': [], // Array of Strings, filepaths to files containing hooks (can use glob wildcards)

    'reporter': ['dot', 'html'], // Array of possible reporters, see folder src/reporters

    'output': [],     // Array of Strings, filepaths to files used for output of file-based reporters

    'inline-errors': false, // Boolean, If failures/errors are display immediately in Dredd run

    'color': true,
    'timestamp': false
  },

  'emitter': EventEmitterInstance, // optional - listen to test progress, your own instance of EventEmitter

  'hooksData': {
    'pathToHook' : '...'
  }

  'data': {
    'path/to/file': '...'
  }
}
```

### server (String)

Your choice of the API endpoint to test the API Blueprint against.
It must be a valid URL (you can specify `port`, `path` and http or https `protocol`).

### options (Object)

Because `options.path` array is required, you must specify options. You'll end
with errors otherwise.

#### options.path (Array)

__Required__ Array of filepaths to API Blueprint files. Or it can also be an URL to download the API Blueprint from internet via http(s) protocol.

#### data (Object)

__Optional__ Object with keys as `filename` and value as `blueprint`-code.

Useful when you don't want to operate on top of filesystem and want to pass
code of your API Blueprints as a string. You get the point.

#### hooksData (Object)

__Optional__ Object with keys as `filename` and strings with JavaScript hooks code.

Load hooks file code from string. Must be used together with sandboxed mode.

```javascript
{
  'data': {
    './file/path/blueprint.apib': 'FORMAT: 1A\n\n# My String API\n\nGET /url\n+ Response 200\n\n        Some content',
    './another/file.apib': '# Another API\n\n## Group Machines\n\n### Machine [/machine]\n\n#### Read machine [GET]\n\n...'
  }
}
```



## Dredd Execution lifecycle

1. load and parse blueprints
  - report parsing warnings
2. pre-run blueprint check
  - missing example values for URI template parameters
  - required parameters present in URI
  - not parseable json bodies
  - not valid uri parameters
  - invalid uri templates
3. compile HTTP transactions from blueprints
  - inherit headers
  - inherit parameters
  - expand uri templates with parameters
4. load hooks
5. test run
  - report test run `start`
  - run `beforeAll` hooks
  - for each compiled transaction
    - report `test start`
    - run `beforeEach` hook
    - run `before` hook
    - send HTTP request
    - receive HTTP response
    - run [Gavel][] validation
    - run `after` hook
    - run `afterEach` hook
    - report `test end` with result for in-progress reporting
  - run `afterAll` Hooks
6. report test run `end` with result statistics

