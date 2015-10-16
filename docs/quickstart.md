## Quickstart

- If you don't have [Node.js](https://nodejs.org/) installed, you may want to use [NVM](https://github.com/creationix/nvm)
- Create an [API blueprint](https://apiblueprint.org/) in `apiary.apib`

**Note:** Dredd works smoothly with node.js ~0.8.15, 0.10.x, 0.12.x
and iojs v1.x.x. Support for node.js 4.x.x is on the way.

```
# GET /message
+ Response 200 (text/plain)

      Hello World!
```
- Install Dredd if you haven't already

```
$ npm install -g dredd

```

- Run interactive configuration:

```
$ dredd init
? Location of the API blueprint: apiary.apib
? Command to start API backend server e.g. (bundle exec rails server)
? URL of tested API endpoint: http://localhost:3000
? Programming language of hooks:
❯ ruby
  python
  nodejs
? Dredd is best served with Continuous Integration. Create CircleCI config for Dredd? Yes

```

- Install [Ruby](hooks-ruby.md) or [Python](hooks-python.md) handler if needed

- Run dredd

```
$ dredd
```
