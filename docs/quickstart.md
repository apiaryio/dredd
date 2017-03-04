# Quickstart

In following tutorial you can quickly learn how to test a simple HTTP API application with Dredd. The tested application will be very simple backend written in [Express.js][].

## Install Dredd

```
$ npm install -g dredd
```

If you're not familiar with the Node.js ecosystem or you bump into any issues, follow the [installation guide](installation.md).

**Note:** While Dredd seems to work on Windows for many users, it's not officially supported on the platform yet. See [details](installation.md#windows-support).

## Document Your API

First, let's design the API we are about to build and test. That means you will need to create an API description file, which will document how your API should look like. Dredd supports two formats of API description documents:

- [API Blueprint][]
- [Swagger][]

If you choose API Blueprint, create a file called `api-description.apib` in the root of your project and save it with following content:

```markdown
FORMAT: 1A

# GET /
+ Response 200 (application/json; charset=utf-8)

        {"message": "Hello World!"}
```

If you choose Swagger, create a file called `api-description.yml`:

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
          description: ""
          schema:
            type: object
            properties:
              message:
                type: string
            required:
              - message
```

## Implement Your API

As we mentioned in the beginning, we'll use [Express.js][] to implement the API. Install the framework by `npm`:

```sh
$ npm init
$ npm install express --save
```

Now let's code the thing! Create a file called `app.js` with following contents:

```javascript
var app = require('express')();

app.get('/', function(req, res) {
  res.json({message: 'Hello World!'});
})

app.listen(3000);
```

## Test Your API

At this moment, the implementation is ready to be tested. Let's run the server as a background process and let's test it:

```sh
$ node app.js &
```

Finally, let Dredd validate whether your freshly implemented API complies with the description you have:

```sh
$ dredd api-description.apib http://127.0.0.1:3000  # API Blueprint
$ dredd api-description.yml http://127.0.0.1:3000  # Swagger
```

## Configure Dredd

Dredd can be configured by [many CLI options](usage-cli.md). It's recommended to save your Dredd configuration alongside your project, so it's easier to repeatedly execute always the same test run. Use interactive configuration wizard to create `dredd.yml` file in the root of your project:

```
$ dredd init
? Location of the API description document: api-description.apib
? Command to start API backend server e.g. (bundle exec rails server)
? URL of tested API endpoint: http://127.0.0.1:3000
? Programming language of hooks:
❯ nodejs
  python
  ruby
  ...
? Dredd is best served with Continuous Integration. Create CircleCI config for Dredd? Yes
```

Now you can start test run just by typing `dredd`!

```
$ dredd
```

## Use Hooks

Dredd's [hooks](hooks.md) enable you to write some glue code in your favorite language to support enhanced scenarios in your API tests. Read the documentation about hooks to learn more on how to write them. Choose your language and install corresponding hook handler library.

## Advanced Examples

For more complex example applications, please refer to:

- [Express.js example application](http://github.com/apiaryio/dredd-example)
- [Ruby on Rails example application](https://github.com/theodorton/dredd-test-rails)
- [Laravel example application](https://github.com/ddelnano/dredd-hooks-php/wiki/Laravel-Example)


[API Blueprint]: http://apiblueprint.org/
[Swagger]: http://swagger.io/
[Express.js]: http://expressjs.com/starter/hello-world.html
