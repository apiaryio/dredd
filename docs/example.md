# Dredd Example with API Backend Application

This is an example how to create a simple [Express.js][] API backend application tested with Dredd

## Create API Blueprint File

Create a new documentation file in [API Blueprint][] format in `blueprint.md`

```markdown
# GET /
+ Response 200 (application/json; charset=utf-8)

      {"message": "Hello World!"}
```

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
$ dredd blueprint.md http://localhost:3000
```

## Advanced Examples

For more complex examples applications, please refer to:

- [Express.js example application](http://github.com/apiaryio/dredd-example)
- [Ruby on Rails example application](https://github.com/theodorton/dredd-test-rails)
- [Laravel example application](https://github.com/ddelnano/dredd-hooks-php/wiki/Laravel-Example)


[API Blueprint]: http://apiblueprint.org/
[Express.js]: http://expressjs.com/starter/hello-world.html
