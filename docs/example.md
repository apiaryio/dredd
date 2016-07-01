# Dredd Example with API Backend Application

This is an example how to create a simple [Express.js][] API backend application tested with Dredd

## Create API Description Document

Create a new API description file. In case of the [API Blueprint][] format, it could look like this:

```markdown
FORMAT: 1A

# GET /
+ Response 200 (application/json; charset=utf-8)

        {"message": "Hello World!"}
```

Save it as `api-description.apib`. In case of the [Swagger][] format, let's use following:

```yaml
swagger: "2.0"
info:
  version: "1.0"
  title: Example API
  license:
    name: MIT
host: www.example.com
basePath: /
schemes:
  - http
paths:
  /:
    get:
      produces:
        - application/json; charset=utf-8
      responses:
        200:
          description: ''
          schema:
            type: object
            properties:
              message:
                type: string
            required:
              - message
```

Let's save it as `api-description.yml`.

## Install Express.js

For this application, we'll use [Express.js][]. Install using `npm`.

```sh
$ npm install express
```

## Create Express Application

Create file with backend application in `app.js`.

```javascript
var app = require('express')();

app.get('/', function (req, res) {
  res.json({message: 'Hello World!'});
})

var server = app.listen(3000);
```

## Run the API application in Background

Here we'll run the Express.js application we created in the background so we can type more commands in the console.

```sh
$ node app.js &
```

## Run Dredd

Finally, run Dredd for validation:

```sh
$ dredd api-description.apib http://localhost:3000
```

When using Swagger, change the command respectively:

```sh
$ dredd api-description.yml http://localhost:3000
```

## Advanced Examples

For more complex examples applications, please refer to:

- [Express.js example application](http://github.com/apiaryio/dredd-example)
- [Ruby on Rails example application](https://github.com/theodorton/dredd-test-rails)
- [Laravel example application](https://github.com/ddelnano/dredd-hooks-php/wiki/Laravel-Example)


[API Blueprint]: http://apiblueprint.org/
[Swagger]: http://swagger.io/
[Express.js]: http://expressjs.com/starter/hello-world.html
