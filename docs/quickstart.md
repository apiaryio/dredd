## Quickstart

- If you don't have [Node.js](https://nodejs.org/) installed, you may want to use [NVM](https://github.com/creationix/nvm).
- Create API Description Document. In this tutorial, we'll use [API Blueprint](https://apiblueprint.org/) format and the `api-description.apib` filename.

```
# GET /message
+ Response 200 (text/plain)

      Hello World!
```

- Install Dredd.

```
$ npm install -g dredd
```

- Run interactive configuration:

```
$ dredd init
? Location of the API description document: api-description.apib
? Command to start API backend server e.g. (bundle exec rails server)
? URL of tested API endpoint: http://localhost:3000
? Programming language of hooks:
❯ nodejs
  python
  ruby
  ...
? Dredd is best served with Continuous Integration. Create CircleCI config for Dredd? Yes
```

- Install hook handler for your favorite language. See [hooks documentation](hooks.md) for list of supported languages.
- Run the `dredd` command!

```
$ dredd
```
