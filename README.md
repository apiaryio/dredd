# Dredd — HTTP API Testing Framework

[![npm version](https://badge.fury.io/js/dredd.svg)](https://www.npmjs.com/package/dredd)
[![Build Status](https://travis-ci.org/apiaryio/dredd.svg?branch=master)](https://travis-ci.org/apiaryio/dredd)
[![Build Status](https://ci.appveyor.com/api/projects/status/n3ixfxh72qushyr4/branch/master?svg=true)](https://ci.appveyor.com/project/Apiary/dredd/branch/master)
[![Dependency Status](https://david-dm.org/apiaryio/dredd.svg)](https://david-dm.org/apiaryio/dredd)
[![devDependency Status](https://david-dm.org/apiaryio/dredd/dev-status.svg)](https://david-dm.org/apiaryio/dredd#info=devDependencies)
[![Coverage Status](https://coveralls.io/repos/apiaryio/dredd/badge.svg?branch=master)](https://coveralls.io/r/apiaryio/dredd?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/npm/dredd/badge.svg)](https://snyk.io/test/npm/dredd)
[![Join the chat at https://gitter.im/apiaryio/dredd](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/apiaryio/dredd?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

![Dredd - HTTP API Testing Framework](img/dredd.png?v=3&raw=true)

> **Dredd is a language-agnostic command-line tool for validating
API description document against backend implementation of the API.**

- [Documentation][]
- [Changelog][]
- [Contributor's Guidelines][]

Dredd reads your API description and step by step validates whether your API
implementation replies with responses as they are described in the
documentation.

### Supported API Description Formats

- [API Blueprint][]
- [Swagger][]

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

## Installation

```
$ npm install -g dredd
```

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
[Swagger]: http://swagger.io/

[Documentation]: https://dredd.readthedocs.io/en/latest/
[Changelog]: https://github.com/apiaryio/dredd/releases
[Contributor's Guidelines]: https://dredd.readthedocs.io/en/latest/contributing/

[Travis CI]: https://travis-ci.org/
[CircleCI]: https://circleci.com/
[Jenkins]: http://jenkins-ci.org/
