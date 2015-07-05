# Dredd — HTTP API Testing Framework

[![Build Status](https://travis-ci.org/apiaryio/dredd.png?branch=master)](https://travis-ci.org/apiaryio/dredd)
[![Dependency Status](https://david-dm.org/apiaryio/dredd.png)](https://david-dm.org/apiaryio/dredd)
[![devDependency Status](https://david-dm.org/apiaryio/dredd/dev-status.png)](https://david-dm.org/apiaryio/dredd#info=devDependencies)
[![Coverage Status](https://coveralls.io/repos/apiaryio/dredd/badge.png?branch=master)](https://coveralls.io/r/apiaryio/dredd?branch=master)
[![Join the chat at https://gitter.im/apiaryio/dredd](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/apiaryio/dredd?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

![Dredd API Blueprint testing tool](https://raw.github.com/apiaryio/dredd/master/img/Dredd.png)

Dredd is a language agnostic command-line tool for testing API documentation written in the [API Blueprint][]
format against its backend implementation. With Dredd you can easily plug your
API documentation into the Continous Integration systems like [Travis CI][]
or [Jenkins][] and have API documentation up-to-date all the time.
Dredd uses [Gavel][] for judging if a particular API response is valid
or if it isn't. If you are curious about how decisions are made, please refer
to Gavel's [behavior specification][https://www.relishapp.com/apiary/gavel/docs].

Dredd supports writing [hooks](hook.md) glue code for testing statefull servers, workflows and loading fixtures in:

- [Ruby](hooks_ruby.md)
- [Python](hooks_python.md)
- [Node.js](hooks.md)
- Addd your language here

## Documentation Reference

1. [Overview](overview.md)
2. [Quickstart](quickstart.md)
3. [Usage](usage.md)
4. [Hooks](hooks.md)
5. [Ruby Hooks](hooks-ruby.md)
6. [Python Hooks](hooks-python.md)
7. [Node.js Hooks](hooks-nodejs.md)
8. [Sandboxed JavaScript Hooks](hooks-js-sandbox.md)
9. [Hooks in new language](hooks-new-language.md)
10. [Example](example.md)

## Useful Links

- [GitHub Repository](https://github.com/apiaryio/dredd)
- [Issues](https://github.com/apiaryio/dredd/issues?q=is%3Aopen)
- [Virtual Environment](https://github.com/apiaryio/dredd/blob/master/VirtualDevelopmentEnvironment.md)
- [Express.js example application](http://github.com/apiaryio/dredd-example)
- [Ruby on Rails example application](https://github.com/theodorton/dredd-test-rails)

[API Blueprint]: http://apiblueprint.org/
[test coverage]: https://coveralls.io/r/apiaryio/dredd?branch=master
[Travis CI]: https://travis-ci.org/
[Jenkins]: http://jenkins-ci.org/
[Gavel]: http://blog.apiary.io/2013/07/24/Bam-this-is-Gavel/
[behavior specification]: https://www.relishapp.com/apiary/gavel/docs

## Editing documentation

The documentation for Dredd is written using [MkDocs](http://www.mkdocs.org/). To contribute to Dredd's documentation, you will need to follow the [MkDocs installation instructions](http://www.mkdocs.org/#installation). Once installed, you may use `mkdocs serve` from the Dredd directory to run the local server for the documentation.

## Changelog updates

Changes are provided in a human-readable format in [changelog](CHANGELOG.md) file.
In order to generate pull-request commit messages with authors, please run `npm run changelist`. You can then hand-tweak the Changelog file from the generated content of `HISTORY-Dredd.md` file.
