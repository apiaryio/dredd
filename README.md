# Dredd — HTTP API Testing Framework

[![Build Status](https://travis-ci.org/apiaryio/dredd.svg?branch=master)](https://travis-ci.org/apiaryio/dredd)
[![Dependency Status](https://david-dm.org/apiaryio/dredd.svg)](https://david-dm.org/apiaryio/dredd)
[![devDependency Status](https://david-dm.org/apiaryio/dredd/dev-status.svg)](https://david-dm.org/apiaryio/dredd#info=devDependencies)
[![Coverage Status](https://coveralls.io/repos/apiaryio/dredd/badge.svg?branch=master)](https://coveralls.io/r/apiaryio/dredd?branch=master)
[![Join the chat at https://gitter.im/apiaryio/dredd](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/apiaryio/dredd?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

![Dredd - HTTP API Testing Framework](img/dredd.png?v=3&raw=true)

> **Dredd is a language-agnostic command-line tool for validating
API documentation written in [API Blueprint][] format against its backend
implementation.**

- [Documentation][]
- [Changelog][]
- [Contributor's Guidelines][]

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

## Installation

```
$ npm install -g dredd
```

> **Note:** Dredd works smoothly with Node.js 5, 4, 0.12, 0.10, and io.js v2.5.

## Quick Start

1.  Create an [API Blueprint][] file called `api-description.apib`.
    Follow [tutorial at API Blueprint website][API Blueprint tutorial]
    or just take one of the [ready-made examples][API Blueprint examples].
2.  Run interactive configuration:

    ```shell
    $ dredd init
    ```
3.  Run Dredd:

    ```shell
    $ dredd
    ```
4.  To see how to use all Dredd's features, browse the
    [full documentation][Documentation].


[API Blueprint]: http://apiblueprint.org/
[API Blueprint tutorial]: https://apiblueprint.org/documentation/tutorial.html
[API Blueprint examples]: https://github.com/apiaryio/api-blueprint/tree/master/examples

[Documentation]: http://dredd.readthedocs.org/en/latest/
[Changelog]: CHANGELOG.md
[Contributor's Guidelines]: CONTRIBUTING.md

[Travis CI]: https://travis-ci.org/
[CircleCI]: https://circleci.com/
[Jenkins]: http://jenkins-ci.org/
