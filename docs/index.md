# Dredd — HTTP API Testing Framework

[![Build Status](https://travis-ci.org/apiaryio/dredd.svg?branch=master)](https://travis-ci.org/apiaryio/dredd)
[![Dependency Status](https://david-dm.org/apiaryio/dredd.svg)](https://david-dm.org/apiaryio/dredd)
[![devDependency Status](https://david-dm.org/apiaryio/dredd/dev-status.svg)](https://david-dm.org/apiaryio/dredd#info=devDependencies)
[![Coverage Status](https://coveralls.io/repos/apiaryio/dredd/badge.svg?branch=master)](https://coveralls.io/r/apiaryio/dredd?branch=master)
[![Join the chat at https://gitter.im/apiaryio/dredd](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/apiaryio/dredd?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

![Dredd - HTTP API Testing Framework](https://raw.github.com/apiaryio/dredd/master/img/dredd.png?v=3&raw=true)

> **Dredd is a language-agnostic command-line tool for validating
API description document against backend implementation of the API.**

Dredd reads your API description and step by step validates whether your API
implementation replies with responses as they are described in the
documentation.

### Supported API Description Formats

- [API Blueprint][]
- [Swagger][] **(experimental)**

### Supported Hooks Languages

Dredd supports writing [hooks](https://dredd.readthedocs.io/en/latest/hooks/)
— a glue code for each test setup and teardown. Following languages are supported:

- [Go](https://dredd.readthedocs.io/en/latest/hooks-go/)
- [Node.js (JavaScript)](https://dredd.readthedocs.io/en/latest/hooks-nodejs/)
- [Perl](https://dredd.readthedocs.io/en/latest/hooks-perl/)
- [PHP](https://dredd.readthedocs.io/en/latest/hooks-php/)
- [Python](https://dredd.readthedocs.io/en/latest/hooks-python/)
- [Ruby](https://dredd.readthedocs.io/en/latest/hooks-ruby/)
- Didn't find your favorite language? _[Add a new one!](https://dredd.readthedocs.io/en/latest/hooks-new-language/)_

### Continuous Integration Support

- [Travis CI][]
- [CircleCI][]
- [Jenkins][]
- _...and any other *nix based CI!_

## Documentation Reference

- Dredd
    - [About Dredd](index.md)
    - [Quickstart](quickstart.md)
    - [Execution Lifecycle](execution-lifecycle.md)
    - [Overview](overview.md)
- Usage
    - [Command-line Interface](usage-cli.md)
    - [From JavaScript](usage-js.md)
- Hooks
    - [About Hooks](hooks.md)
    - Supported Languages
        - [Go](hooks-go.md)
        - [JavaScript (Sandboxed)](hooks-js-sandbox.md)
        - [Node.js](hooks-nodejs.md)
        - [Perl](hooks-perl.md)
        - [PHP](hooks-php.md)
        - [Python](hooks-python.md)
        - [Ruby](hooks-ruby.md)
    - [Other Languages](hooks-new-language.md)
- Example
    - [Full Example](example.md)

## Useful Links

- [GitHub Repository][]
- [Bug Tracker][]
- [Changelog][]
- [Contributor's Guidelines][]

## Example Applications

- [Express.js](http://github.com/apiaryio/dredd-example)
- [Ruby on Rails](https://gitlab.com/theodorton/dredd-test-rails/)


[API Blueprint]: http://apiblueprint.org/
[Swagger]: http://swagger.io/

[GitHub Repository]: https://github.com/apiaryio/dredd
[Bug Tracker]: https://github.com/apiaryio/dredd/issues?q=is%3Aopen
[Changelog]: https://github.com/apiaryio/dredd/blob/master/CHANGELOG.md
[Contributor's Guidelines]: https://github.com/apiaryio/dredd/blob/master/CONTRIBUTING.md

[Travis CI]: https://travis-ci.org/
[CircleCI]: https://circleci.com/
[Jenkins]: http://jenkins-ci.org/
