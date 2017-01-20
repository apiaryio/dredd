# How-To Guides

In the following guides you can find tips and best practices how to cope with some common tasks. While searching this page for particular keywords can give you quick results, reading the whole section should help you to learn some of the Dredd's core concepts and usual ways how to approach problems when testing with Dredd.

## Isolation of HTTP Transactions

Requests in the API description usually aren't sorted in order to comply with logical workflow of the tested application. To get the best results from testing with Dredd, you should ensure each resource action ([API Blueprint][]) or operation ([Swagger][]) is executed in isolated context. This can be easily achieved using [hooks](hooks.md), where you can provide your own setup and teardown code for each HTTP transaction.

You should understand that testing with Dredd is an analogy to **unit tests** of your application code. In unit tests, each unit should be testable without any dependency on other units or previous tests.

### Example

Common case is to solve a situation where we want to test deleting of a resource. Obviously, to test deleting of a resource, we first need to create one. However, the order of HTTP transactions can be pretty much random in the API description.

To solve the situation, it's recommended to isolate the deletion test by [hooks](hooks.md). Providing `before` hook, we can ensure the database fixture will be present every time Dredd will try to send the request to delete a category item.

#### API Blueprint

```markdown
FORMAT: 1A

# Categories API

## Categories [/categories]

### Create a Category [POST]
+ Response 201

## Category [/category/{id}]
+ Parameters
    + id: 42 (required)

### Delete a Category [DELETE]
+ Response 204

## Category Items [/category/{id}/items]
+ Parameters
    + id: 42 (required)

## Create an Item [POST]
+ Response 201
```

To have an idea where we can hook our arbitrary code, we should first ask Dredd to list all available transaction names:

```
$ dredd api-description.apib http://localhost:3000 --names
info: Categories > Create a category
info: Category > Delete a category
info: Category Items > Create an item
```

Now we can create a `hooks.js` file. The file will contain setup and teardown of the database fixture:

```javascript
hooks = require('hooks');
db = require('./src/db');

beforeAll(function() {
  db.cleanUp();
});

afterEach(function(transaction) {
  db.cleanUp();
});

before('Category > Delete a Category', function() {
  db.createCategory({id: 42});
});

before('Category Items > Create an Item', function() {
  db.createCategory({id: 42});
});
```

#### Swagger

```yaml
swagger: "2.0"
info:
  version: "0.0.0"
  title: Categories API
  license:
    name: MIT
host: www.example.com
basePath: /
schemes:
  - http
consumes:
  - application/json
produces:
  - application/json
paths:
  /categories:
    post:
      responses:
        200:
          description: ""
  /category/{id}:
    delete:
      parameters:
        - name: id
          in: path
          required: true
          type: string
          enum:
            - "42"
      responses:
        200:
          description: ""
  /category/{id}/items:
    post:
      parameters:
        - name: id
          in: path
          required: true
          type: string
          enum:
            - "42"
      responses:
        200:
          description: ""
```

To have an idea where we can hook our arbitrary code, we should first ask Dredd to list all available transaction names:

```
$ dredd api-description.yml http://localhost:3000 --names
info: /categories > POST > 200 > application/json
info: /category/{id} > DELETE > 200 > application/json
info: /category/{id}/items > POST > 200 > application/json
```

Now we can create a `hooks.js` file. The file will contain setup and teardown of the database fixture:

```javascript
hooks = require('hooks');
db = require('./src/db');

beforeAll(function() {
  db.cleanUp();
});

afterEach(function(transaction) {
  db.cleanUp();
});

before('/category/{id}', function() {
  db.createCategory({id: 42});
});

before('/category/{id}/items', function() {
  db.createCategory({id: 42});
});
```

## Testing API Workflows

Often you want to test a sequence of steps, a scenario, rather than just one request-response pair in isolation. Since the API description formats are quite limited in their support of documenting scenarios, Dredd probably isn't the best tool to provide you with this kind of testing. There are some tricks though, which can help you to work around some of the limitations.

> **Note:** [API Blueprint][] prepares direct support for testing and scenarios. Interested?
  Check out [apiaryio/api-blueprint#21](https://github.com/apiaryio/api-blueprint/issues/21)!

To test various scenarios, you will want to write each of them into a separate API description document. To load them during a single test run, use the [--path](usage-cli.md#-path-p) option.

For workflows to work properly, you'll also need to keep **shared context** between individual HTTP transactions. You can use [hooks](hooks.md) in order to achieve that. See tips on how to [pass data between transactions](hooks.md#sharing-data-between-steps-in-request-stash).

### API Blueprint Example

Imagine we have a simple workflow described:

```markdown
FORMAT: 1A

# My Scenario

## POST /login

+ Request (application/json)

        {"username": "john", "password": "d0e"}


+ Response 200 (application/json)

        {"token": "s3cr3t"}

## GET /cars

+ Response 200 (application/json)

        [
            {"id": "42", "color": "red"}
        ]

## PATCH /cars/{id}
+ Parameters
    + id: 42 (string, required)

+ Request (application/json)

        {"color": "yellow"}

+ Response 200 (application/json)

        {"id": 42, "color": "yellow"}

```

### Writing Hooks

To have an idea where we can hook our arbitrary code, we should first ask Dredd to list all available transaction names:

```
$ dredd api-description.apib http://localhost:3000 --names
info: /login > POST
info: /cars > GET
info: /cars/{id} > PATCH
```

Now we can create a `hooks.js` file. The code of the file will use global `stash` variable to share data between requests:

```javascript
hooks = require('hooks');
db = require('./src/db');

stash = {}

// Stash the token we've got
after('/login > POST', function (transaction) {
  stash.token = JSON.parse(transaction.real.body).token;
});

// Add the token to all HTTP transactions
beforeEach(function (transaction) {
  if (stash.token) {
    transaction.headers['X-Api-Key'] = stash.token
  };
});

// Stash the car ID we've got
after('/cars > GET', function (transaction) {
  stash.carId = JSON.parse(transaction.real.body).id;
});

// Replace car ID in request with the one we've stashed
before('/cars/{id} > PATCH', function (transaction) {
  transaction.fullPath = transaction.fullPath.replace('42', stash.carId)
  transaction.request.uri = transaction.fullPath
})
```

### Swagger Example

Imagine we have a simple workflow described:

```yaml
swagger: "2.0"
info:
  version: "0.0.0"
  title: Categories API
  license:
    name: MIT
host: www.example.com
basePath: /
schemes:
  - http
consumes:
  - application/json
produces:
  - application/json
paths:
  /login:
    post:
      parameters:
        - name: body
          in: body
          required: true
          schema:
            type: object
            properties:
              username:
                type: string
              password:
                type: string
      responses:
        200:
          description: ""
          schema:
            type: object
            properties:
              token:
                type: string
  /cars:
    get:
      responses:
        200:
          description: ""
          schema:
            type: array
            items:
              type: object
              properties:
                id:
                  type: string
                color:
                  type: string
  /cars/{id}:
    patch:
      parameters:
        - name: id
          in: path
          required: true
          type: string
          enum:
            - "42"
        - name: body
          in: body
          required: true
          schema:
            type: object
            properties:
              color:
                type: string
      responses:
        200:
          description: ""
          schema:
            type: object
            properties:
              id:
                type: string
              color:
                type: string
```

### Writing Hooks

To have an idea where we can hook our arbitrary code, we should first ask Dredd to list all available transaction names:

```
$ dredd api-description.yml http://localhost:3000 --names
info: /login > POST > 200 > application/json
info: /cars > GET > 200 > application/json
info: /cars/{id} > PATCH > 200 > application/json
```

Now we can create a `hooks.js` file. The code of the file will use global `stash` variable to share data between requests:

```javascript
hooks = require('hooks');
db = require('./src/db');

stash = {}

// Stash the token we've got
after('/login > POST > 200 > application/json', function (transaction) {
  stash.token = JSON.parse(transaction.real.body).token;
});

// Add the token to all HTTP transactions
beforeEach(function (transaction) {
  if (stash.token) {
    transaction.headers['X-Api-Key'] = stash.token
  };
});

// Stash the car ID we've got
after('/cars > GET > 200 > application/json', function (transaction) {
  stash.carId = JSON.parse(transaction.real.body).id;
});

// Replace car ID in request with the one we've stashed
before('/cars/{id} > PATCH > 200 > application/json', function (transaction) {
  transaction.fullPath = transaction.fullPath.replace('42', stash.carId)
  transaction.request.uri = transaction.fullPath
})
```

## Integrating Dredd with Your Test Suite

Generally, if you want to add Dredd to your existing test suite, you can just save Dredd configuration in the `dredd.yml` file and add call for `dredd` command to your task runner.

There are also some packages which make the integration a piece of cake:

- [grunt-dredd](https://github.com/mfgea/grunt-dredd)
- [dredd-rack](https://github.com/gonzalo-bulnes/dredd-rack)
- [meteor-dredd](https://github.com/storeness/meteor-dredd)

To find more, search for `dredd` in your favorite language's package index.

## Continuous Integration

It's a good practice to make Dredd part of your continuous integration workflow. Only that way you can ensure that application code you'll produce won't break the contract you provide in your API documentation.

Dredd's interactive configuration wizard, `dredd init`, can help you with setting up `dredd.yml` configuration file and with modifying or generating CI configuration files for [Travis CI][] or [CircleCI][].

If you prefer to add Dredd yourself or you look for inspiration on how to add Dredd to other continuous integration services, see examples below. When testing in CI, always pin your Dredd version to a specific number and upgrade to newer releases manually.

### `circle.yml` Configuration File for [CircleCI][]

```
dependencies:
  pre:
    - npm install -g dredd@x.x.x
test:
  pre:
    - dredd apiary.apib http://localhost:3000
```

### `.travis.yml` Configuration File for [Travis CI][]

```
before_install:
  - npm install -g dredd@x.x.x
before_script:
  - dredd apiary.apib http://localhost:3000
```

## Authenticated APIs

Dredd supports all common authentication schemes:

- Basic access authentication
- Digest access authentication
- OAuth (any version)
- CSRF tokens
- ...

Use `user` setting in your configuration file or `--user` argument to provide HTTP basic authentication:

```
--user=user:password
```

Most of the authentication schemes use HTTP header for carrying the authentication data. If you don't want to add authentication HTTP header to every request in the API description, you can instruct Dredd to do it for you:

```
--headers="Authorization: Basic YmVuOnBhc3M="
```

## Sending Multipart Requests

API Blueprint format supports `multipart/form-data` media type and so does Dredd. In the example below, Dredd will automatically add `LF` to all lines in request body:

```markdown
# POST /images

+ Request (multipart/form-data;boundary=---BOUNDARY)
    + Headers

            Authorization: qwertyqwerty

    + Body

            ---BOUNDARY
            Content-Disposition: form-data; name="json"


            {"name": "test"}
            ---BOUNDARY
            Content-Disposition: form-data; name="image"; filename="filename.jpg"
            Content-Type: image/jpeg

            data
            ---BOUNDARY--

```

## Multiple Requests and Responses within One API Blueprint Action

> **Note:** For details on this topic see also [How Dredd Works With HTTP Transactions](how-it-works.md#how-dredd-works-with-http-transactions).

To test multiple requests and responses within one action in Dredd, you need to cluster them into pairs:

```markdown
FORMAT: 1A

# My API

## Resource [/resource/{id}]

+ Parameters
    + id: 42 (required)

###  Update Resource [PATCH]

+ Request (application/json)

        {"color": "yellow"}


+ Response 200 (application/json)

        {"color": "yellow", "id": 1}


+ Request Edge Case (application/json)

        {"weight": 1}

+ Response 400 (application/vnd.error+json)

        {"message": "Validation failed"}

```

Dredd will detect two HTTP transaction examples and will compile following transaction names:

```
$ dredd api-description.apib http://localhost --names
info: Beginning Dredd testing...
info: Resource > Update Resource > Example 1
info: Resource > Update Resource > Example 2
```

In case you need to perform particular request with different URI parameters and standard inheritance of URI parameters isn't working for you, try [modifying transaction before its execution](hooks.md#modifying-transactions-prior-to-execution) in hooks.

## Testing non-2xx Responses with Swagger

When using [Swagger][] format, by default Dredd tests only responses with `2xx` status codes. Responses with other codes are marked as _skipped_ and can be activated in [hooks](hooks.md):

```javascript
var hooks = require('hooks');

hooks.before('/resource > GET > 500 > application/json', function (transaction, done) {
  transaction.skip = false;
  done();
});
```

## Using Apiary Reporter and Apiary Tests

Command-line output of complex HTTP responses and expectations can be hard to read. To tackle the problem, you can use Dredd to send test reports to [Apiary][]. Apiary provides a comfortable interface for browsing complex test reports:

```
$ dredd apiary.apib http://localhost --reporter=apiary
warn: Apiary API Key or API Project Subdomain were not provided. Configure Dredd to be able to save test reports alongside your Apiary API project: http://dredd.readthedocs.io/en/latest/how-to-guides/#using-apiary-reporter-and-apiary-tests
info: Beginning Dredd testing...
pass: DELETE /honey duration: 884ms
complete: 1 passing, 0 failing, 0 errors, 0 skipped, 1 total
complete: Tests took 1631ms
complete: See results in Apiary at: https://app.apiary.io/public/tests/run/74d20a82-55c5-49bb-aac9-a3a5a7450f06
```

![Apiary Tests](https://raw.github.com/apiaryio/dredd/master/img/apiary-tests.png?raw=true)

### Saving Test Reports under Your Account in Apiary

As you can see on the screenshot, the test reports are anonymous by default and will expire after some time. However, if you provide Apiary credentials, your test reports will appear on the _Tests_ page of your API Project. This is great especially for introspection of test reports from Continuous Integration.

To get and setup credentials, just follow the tutorial in Apiary:

![Apiary Tests Tutorial](https://raw.github.com/apiaryio/dredd/master/img/apiary-tests-tutorial.png?raw=true)

As you can see, the parameters go like this:

```
$ dredd -c apiaryApiKey:<Apiary API Key> -c apiaryApiName:<API Project Subdomain>
```

In addition to using parameters and `dredd.yml`, you can also use environment variables:

- `APIARY_API_KEY=<Apiary API Key>` - Alternative way to pass credentials to Apiary Reporter.
- `APIARY_API_NAME=<API Project Subdomain>` - Alternative way to pass credentials to Apiary Reporter.

When sending test reports to Apiary, Dredd inspects the environment where it was executed and sends some information about it alongside test results. Those are used mainly for detection whether the environment is Continuous Integration and also, they help you to identify individual test reports on the _Tests_ page. You can use the following variables to tell Dredd what to send:

- agent (string) - `DREDD_AGENT` or current user in the OS
- hostname (string) - `DREDD_HOSTNAME` or hostname of the OS
- CI (boolean) - looks for `TRAVIS`, `CIRCLE`, `CI`, `DRONE`, `BUILD_ID`, ...

## Example Values for Request Parameters

While example values are natural part of the API Blueprint format, the Swagger
specification allows them only for `body` request parameters (`schema.example`).

However, Dredd needs to know what values to use when testing described API, so
it supports `x-example` [vendor extension property][] to overcome the Swagger limitation:

```yaml
...
paths:
  /cars:
    get:
      parameters:
        - name: limit
          in: query
          type: number
          x-example: 42
```

The `x-example` property is respected for all kinds of request parameters except
of `body` parameters, where native `schema.example` should be used.

## Removing Sensitive Data from Test Reports

Sometimes your API sends back sensitive information you don't want to get disclosed in [Apiary Tests](how-to-guides.md#using-apiary-reporter-and-apiary-tests) or in your CI log. In that case you can use [Hooks](hooks.md) to do sanitation. Before diving into examples below, do not forget to consider following:

- Be sure to read [section about security](how-it-works.md#security) first.
- Only the [`transaction.test`](data-structures.md#transaction-test) object will make it to reporters. You don't have to care about sanitation of the rest of the [`transaction`](data-structures.md#transaction) object.
- The `transaction.test.message` and all the `transaction.test.results.body.results.rawData.*.message` properties contain validation error messages. While they're very useful for learning about what's wrong on command line, they can contain direct mentions of header names, header values, body properties, body structure, body values, etc., thus it's recommended their contents are completely removed to prevent unintended leaks of sensitive information.
- Without the `transaction.test.results.body.results.rawData` property [Apiary reporter](how-to-guides.md#using-apiary-reporter-and-apiary-tests) won't be able to render green/red difference between payloads.
- You can use [Ultimate 'afterEach' Guard](#sanitation-ultimate-guard) to make sure you won't leak any sensitive data by mistake.
- If your hooks crash, Dredd will send an error to reporters, alongside with current contents of the [`transaction.test`](data-structures.md#transaction-test) object. See the [Sanitation of Test Data of Transaction With Secured Erroring Hooks](#sanitation-secured-erroring-hooks) example to learn how to prevent this.

### Sanitation of the Entire Request Body

- [API Blueprint](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/entire-request-body.apib)
- [Hooks](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/entire-request-body.js)

### Sanitation of the Entire Response Body

- [API Blueprint](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/entire-response-body.apib)
- [Hooks](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/entire-response-body.js)

### Sanitation of a Request Body Attribute

- [API Blueprint](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/request-body-attribute.apib)
- [Hooks](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/request-body-attribute.js)

### Sanitation of a Response Body Attribute

- [API Blueprint](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/response-body-attribute.apib)
- [Hooks](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/response-body-attribute.js)

### Sanitation of Plain Text Response Body by Pattern Matching

- [API Blueprint](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/plain-text-response-body.apib)
- [Hooks](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/plain-text-response-body.js)

### Sanitation of Request Headers

- [API Blueprint](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/request-headers.apib)
- [Hooks](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/request-headers.js)

### Sanitation of Response Headers

- [API Blueprint](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/response-headers.apib)
- [Hooks](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/response-headers.js)

### Sanitation of URI Parameters by Pattern Matching

- [API Blueprint](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/uri-parameters.apib)
- [Hooks](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/uri-parameters.js)

### Sanitation of Any Content by Pattern Matching

- [API Blueprint](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/any-content-pattern-matching.apib)
- [Hooks](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/any-content-pattern-matching.js)

### Sanitation of Test Data of Passing Transaction

- [API Blueprint](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/transaction-passing.apib)
- [Hooks](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/transaction-passing.js)

### Sanitation of Test Data When Transaction Is Marked as Failed in \'before\' Hook

- [API Blueprint](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/transaction-marked-failed-before.apib)
- [Hooks](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/transaction-marked-failed-before.js)

### Sanitation of Test Data When Transaction Is Marked as Failed in \'after\' Hook

- [API Blueprint](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/transaction-marked-failed-after.apib)
- [Hooks](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/transaction-marked-failed-after.js)

### Sanitation of Test Data When Transaction Is Marked as Skipped

- [API Blueprint](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/transaction-marked-skipped.apib)
- [Hooks](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/transaction-marked-skipped.js)

<a name="sanitation-ultimate-guard"></a>
### Ultimate 'afterEach' Guard Using Pattern Matching

You can use this guard to make sure you won't leak any sensitive data by mistake.

- [API Blueprint](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/any-content-guard-pattern-matching.apib)
- [Hooks](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/any-content-guard-pattern-matching.js)

<a name="sanitation-secured-erroring-hooks"></a>
### Sanitation of Test Data of Transaction With Secured Erroring Hooks

If your hooks crash, Dredd will send an error to reporters, alongside with current contents of the [`transaction.test`](data-structures.md#transaction-test) object. If you want to prevent this, you need to add `try/catch` to your hooks, sanitize the test object, and gracefully fail the transaction.

- [API Blueprint](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/transaction-secured-erroring-hooks.apib)
- [Hooks](https://github.com/apiaryio/dredd/tree/master/test/fixtures/sanitation/transaction-secured-erroring-hooks.js)


[Apiary]: https://apiary.io/
[API Blueprint]: http://apiblueprint.org/
[Swagger]: http://swagger.io/
[Travis CI]: https://travis-ci.org/
[CircleCI]: https://circleci.com/
[vendor extension property]: http://swagger.io/specification/#vendorExtensions
