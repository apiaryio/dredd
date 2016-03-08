# Dredd — HTTP API Testing Framework

[![Build Status](https://travis-ci.org/apiaryio/dredd.svg?branch=master)](https://travis-ci.org/apiaryio/dredd)
[![Dependency Status](https://david-dm.org/apiaryio/dredd.svg)](https://david-dm.org/apiaryio/dredd)
[![devDependency Status](https://david-dm.org/apiaryio/dredd/dev-status.svg)](https://david-dm.org/apiaryio/dredd#info=devDependencies)
[![Coverage Status](https://coveralls.io/repos/apiaryio/dredd/badge.svg?branch=master)](https://coveralls.io/r/apiaryio/dredd?branch=master)
[![Join the chat at https://gitter.im/apiaryio/dredd](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/apiaryio/dredd?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

![Dredd API Blueprint testing tool](https://raw.github.com/apiaryio/dredd/master/img/dredd.png?v=3&raw=true)

> **Dredd is a language-agnostic command-line tool for validating
API documentation written in [API Blueprint][] format against its backend
implementation.**

Dredd reads your API description and step by step validates whether your API
implementation replies with responses as they are described in the
documentation.

### Supported Hook Languages

Dredd supports writing [hooks](http://dredd.readthedocs.org/en/latest/hooks/)
— a glue code for each test setup and teardown.

Following languages are supported:

- [Go](http://dredd.readthedocs.org/en/latest/hooks-go/)
- [Node.js (JavaScript)](http://dredd.readthedocs.org/en/latest/hooks-nodejs/)
- [Perl](http://dredd.readthedocs.org/en/latest/hooks-perl/)
- [PHP](http://dredd.readthedocs.org/en/latest/hooks-php/)
- [Python](http://dredd.readthedocs.org/en/latest/hooks-python/)
- [Ruby](http://dredd.readthedocs.org/en/latest/hooks-ruby/)
- Didn't find your favorite language? _[Add a new one!](https://dredd.readthedocs.org/en/latest/hooks-new-language/)_

### Continuous Integration Support

- [Travis CI][]
- [CircleCI][]
- [Jenkins][]
- _...and any other *nix based CI!_

## Documentation Reference

1. [Overview](overview.md)
2. [Quickstart](quickstart.md)
3. [Usage](usage.md)
4. [Hooks](hooks.md)
5. [Ruby Hooks](hooks-ruby.md)
6. [Python Hooks](hooks-python.md)
7. [Node.js Hooks](hooks-nodejs.md)
8. [PHP Hooks](hooks-php.md)
9. [Sandboxed JavaScript Hooks](hooks-js-sandbox.md)
10. [Hooks in new language](hooks-new-language.md)
11. [Example application](example.md)

## Useful Links

- [GitHub Repository][]
- [Bug Tracker][]
- [Changelog][]
- [Contributor's Guidelines][]

## Example Applications

- [Express.js](http://github.com/apiaryio/dredd-example)
- [Ruby on Rails](https://gitlab.com/theodorton/dredd-test-rails/)


[API Blueprint]: http://apiblueprint.org/

[GitHub Repository]: https://github.com/apiaryio/dredd
[Bug Tracker]: https://github.com/apiaryio/dredd/issues?q=is%3Aopen
[Changelog]: https://github.com/apiaryio/dredd/blob/master/CHANGELOG.md
[Contributor's Guidelines]: https://github.com/apiaryio/dredd/blob/master/CONTRIBUTING.md

[Travis CI]: https://travis-ci.org/
[CircleCI]: https://circleci.com/
[Jenkins]: http://jenkins-ci.org/
