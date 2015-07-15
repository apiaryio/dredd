# Dredd Overview

Dredd works by taking your API Blueprint documentation, creating expectations based on the requests and responses in the blueprint, making requests to your API, and seeing if the responses match. Dredd automatically builds these expectations from the blueprint every time the tests are run.

## Automatic Expectations

Dredd automatically generates expectations on HTTP responses based on examples in the blueprint with use of [Gavel.js](https://github.com/apiaryio/gavel.js) library. Please refer to [Gavel](https://www.relishapp.com/apiary/gavel/docs) rules if you want know more.

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
- If JSON Schema v4 or JSON Schema v3 is given in the blueprint, JSON response must be valid against this schema and JSON example is ignored.

## Using Apiary Test Inspector

Command-line output of complex HTTP responses and expectation can be hard to read. Dredd can send test reports to Apiary and Apiary provides an interface for browsing them. To enable it, use argument `--reporter apiary`.

### Saving under your account in Apiary

Reports are anonymous by default, but you can let Apiary save them under your API in Apiary by specifying Apiary Key and API Name with arguments
`-c apiaryApiKey:yourApiKey -c apiaryApiName:yourapiname` This is great for introspecting reports from Continuous Integration.

**TODO**: Screenshot image

## Testing API Documentation

### Documentation Testability

API Blueprint allows usage of URI templates. If you want to have API documentation to be complete and testable, do not forget to describe all URI-used parameters and provide examples to make Dredd able to expand URI templates with given example values.

### Isolation

API Blueprint structure conforms to the REST paradigm, so in the API Blueprint are documented Resources and their Actions.

It's very likely that your blueprint will not be testable as-is, because actions in the reference will not be sorted in proper order for API's application logic workflow.

Proper testing of API documentation with Dredd is all about isolating each resource action with hook scripts executing code before and after each HTTP transaction to do proper fixtures setup and teardown.

It's an analogy to **unit testing** of your code. In unit testing, each unit should be testable without any dependency on other units or previous tests.

> Each API action should be ran in its **isolated context**.

### Example

It's usual that you discuss an action in the API documentation for some entity deletion before an action for re-using this deleted entity. For example in the API blueprint:

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
dredd blueprint.md localhost:3000 --names
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

If you want to test some sequence of HTTP steps (workflow or scenario) in you API apart of your API reference or a non RESTful API HTTP workflow, you can run Dredd with multiple blueprints by adding  `--path` argument

Unlike API reference testing, scenarios or workflows steps are in **shared context**, so you may want to [pass data between transactions](hooks.md#sharing-data-between-steps-in-request-stash).

### Example

Having following workflow blueprint:

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
$ dredd blueprint.md localhost:3000 --names
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
  transaction.request.url = transaction.request.url.replace('42', stash['carId'])
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
$ dredd blueprint.md localhost --names
info: Beginning Dredd testing...
info: Resource > Update resource > Example 1
info: Resource > Update resource > Example 2
```

[API Blueprint]: http://apiblueprint.org/
[test coverage]: https://coveralls.io/r/apiaryio/dredd?branch=master
[Travis CI]: https://travis-ci.org/
[Jenkins]: http://jenkins-ci.org/
[Gavel]: http://blog.apiary.io/2013/07/24/Bam-this-is-Gavel/
[behavior specification]: https://www.relishapp.com/apiary/gavel/docs
[vde]: https://github.com/apiaryio/dredd/blob/master/VirtualDevelopmentEnvironment.md
[issues]: https://github.com/apiaryio/dredd/issues?state=open
[Express.js]: http://expressjs.com/starter/hello-world.html
[CoffeeScript]: http://coffeescript.org
