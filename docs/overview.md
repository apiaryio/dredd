# Dredd Overview

Dredd works by taking your API description document, creating expectations based on the requests and responses in the description, making requests to your API, and seeing if the responses match. Dredd automatically builds these expectations from the API description every time the tests are run.

## Versioning

Dredd follows [Semantic Versioning][]. To ensure certain stability of your Dredd installation (e.g. in CI), pin the version accordingly. You can also use release tags:

- `npm install dredd` - Installs the latest published version including experimental pre-release versions.
- `npm install dredd@stable` - Skips experimental pre-release versions. Recommended for CI installations.

## Automatic Expectations

Dredd automatically generates expectations on HTTP responses based on examples in the API description with use of [Gavel.js](https://github.com/apiaryio/gavel.js) library. Please refer to [Gavel](https://www.relishapp.com/apiary/gavel/docs) rules if you want know more.

**Remember:**  You can easily write additional [custom expectations](hooks.md#using-chai-assertions) in hooks.

### Headers Expectations

- All headers given in example must be present in the response
- Only values of headers significant for content negotiation are validated
- All other headers values can differ.

### Body Expectations

- All JSON keys on any level given in the example must be present in the response JSON
- Response JSON values must be of the same JSON primitive type
- All JSON values can differ
- Arrays can have additional items, type or structure is not validated.
- Plain text must match perfectly
- If JSON Schema v4 or JSON Schema v3 is provided in the API description, JSON response must be valid against this schema and JSON example is ignored.

## Using Apiary Reporter and Apiary Tests

Command-line output of complex HTTP responses and expectations can be hard to read. To tackle the problem, you can use Dredd to send test reports to [Apiary](https://apiary.io/). Apiary provides a comfortable interface for browsing complex test reports:

```
$ dredd apiary.apib http://localhost --reporter=apiary
info: Using apiary reporter.
warn: Apiary reporter environment variable APIARY_API_KEY or APIARY_API_NAME not defined.
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

## Testing API description

### Documentation Testability

API Blueprint allows usage of URI templates. If you want to have API description to be complete and testable, do not forget to describe all URI-used parameters and provide examples to make Dredd able to expand URI templates with given example values.

### Isolation

API Blueprint structure conforms to the REST paradigm, so in the API Blueprint are documented Resources and their Actions.

It's very likely that your API Blueprint document will not be testable as-is, because actions in the reference will not be sorted in proper order for API's application logic workflow.

Proper testing of API description with Dredd is all about isolating each resource action with hook scripts executing code before and after each HTTP transaction to do proper fixtures setup and teardown.

It's an analogy to **unit testing** of your code. In unit testing, each unit should be testable without any dependency on other units or previous tests.

> Each API action should be ran in its **isolated context**.

### Example

It's usual that you discuss an action in the API description for some entity deletion before an action for re-using this deleted entity. For example in the API Blueprint format:

```markdown
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

First, retrieve the transaction names.

```
dredd api-description.apib http://localhost:3000 --names
info: Categories > Create a category
info: Category > Delete a category
info: Category Items > Create an item
```

Now, create a `dreddhooks.js` with a pseudo `db` adapter.

```javascript
db = require('db');
hooks = require('hooks');
beforeAll(function() {
  db.cleanUp();
});

afterEach(function(transaction) {
  db.cleanUp();
});

before('Category > Delete a category', function() {
  db.createCategory({id:42});
});

before('Category Items > Create an item', function() {
  db.createCategory({id:42});
});
```

## Testing API Workflows

If you want to test some sequence of HTTP steps (workflow or scenario) in your API apart of your API reference or a non RESTful API HTTP workflow, you can run Dredd with multiple API description documents by adding  `--path` argument

Unlike API reference testing, scenarios or workflows steps are in **shared context**, so you may want to [pass data between transactions](hooks.md#sharing-data-between-steps-in-request-stash).

### Example

Having following workflow in API description:

```markdown
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

Retrieve transactions names with:

```
$ dredd api-description.apib http://localhost:3000 --names
info: /login > POST
info: /cars > GET
info: /cars/{id} > PATCH
```

Create a `dredhooks.js` file:

```javascript
db = require('db');
hooks = require('hooks');
stash = {}

// stash a retrieved token
after('/login > POST', function (transaction) {
  stash['token'] = JSON.parse(transaction.real.body)['token'];
});

//add token to all HTTP transactions
beforeEach(function (transaction) {
  if(stash['token'] != undefined){
    transaction['headers']['X-Api-Key'] = stash['token']
  };
});

//stash returned car ID
after('/cars > GET', function (transaction) {
  stash['carId'] = JSON.parse(transaction.real.body)['id'];
});

//replace car ID in request for Car resource modification
before('/cars/{id} > PATCH', function (transaction) {
  transaction.fullPath = transaction.fullPath.replace('42', stash['carId'])
  transaction.request.uri = transaction.fullPath
})
```

## Adding to Existing Test Suite

Generally, if you want to add Dredd to your existing test suite, you can just save Dredd configuration to the `dredd.yml` and add call for `dredd` command to your task runner.

In some eco-systems, there is native support for adding Dredd to

- [grunt-dredd](https://github.com/mfgea/grunt-dredd) a grunt task wrapper
- [dredd-rack](https://github.com/gonzalo-bulnes/dredd-rack) a rake task and rack wrapper
- [meteor-dredd](https://github.com/storeness/meteor-dredd) Dredd Integration for Velocity/Meteor

## Continuous Integration

If you didn't make Dredd part to your testing suite which is run in Continuous integration. You can run `dredd init` which will generate a `dredd.yml` configuration file and modify or generate CI configuration.

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

Example `travis.yml` configuration file for [Travis CI][]:

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

If you don't want to add some header directly to the API description, you can add header to all requests from command line:

```
--headers "Authorization: Basic YmVuOnBhc3M="
```

Adding URL query parameter to all requests

Dredd supports all possible authentications of HTTP API like:
  - basic
  - digest
  - OAuth 1.0a
  - OAuth 2.0
  - adding CSRF tokens

## Using Multipart Requests

In following request, dredd will automatically add `LF` to all lines in request body.

```markdown
# POST /images

+ Request (multipart/form-data;boundary=---BOUNDARY)
    + Headers

            Authorization: qwertyqwerty

    + Body

            ---BOUNDARY
            Content-Disposition: form-data; name="json"


            {"name":"test"}
            ---BOUNDARY
            Content-Disposition: form-data; name="image"; filename="filename.jpg"
            Content-Type: image/jpeg

            data
            ---BOUNDARY--

```

## Multiple Requests/Responses in One Action

> Disclaimer: This is a workaround until native support for adding custom URI parameters under example and request section will be available in the API Blueprint.

```markdown
FORMAT: 1A

# My API

## Resource [/resource/{id}]

+ Parameters
  + id (required, `42`)

###  Update resource [PATCH]

+ Request (application/json)

        { "color": "yellow" }


+ Response 200 (application/json)

        { "color": "yellow", "id": 1 }


+ Request Edge Case (application)

        { "weight": "1"}

+ Response 400 (application/vnd.error+json)

        {"message": "Validation failed"}

```


If you need to use different URI address for each example, you can [modify transaction before its execution](hooks.md#modifying-transactions-prior-to-execution) in hooks.

Dredd will compile following transaction names:

```
$ dredd api-description.apib http://localhost --names
info: Beginning Dredd testing...
info: Resource > Update resource > Example 1
info: Resource > Update resource > Example 2
```

[Semantic Versioning]: http://semver.org/
[API Blueprint]: http://apiblueprint.org/
[Travis CI]: https://travis-ci.org/
[Gavel.js]: https://github.com/apiaryio/gavel.js
[Gavel]: https://www.relishapp.com/apiary/gavel/docs
