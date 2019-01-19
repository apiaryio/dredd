# Dredd — HTTP API Testing Framework

[![npm version](https://badge.fury.io/js/dredd.svg)](https://www.npmjs.com/package/dredd)
[![Build Status](https://travis-ci.org/apiaryio/dredd.svg?branch=master)](https://travis-ci.org/apiaryio/dredd)
[![Build Status](https://ci.appveyor.com/api/projects/status/n3ixfxh72qushyr4/branch/master?svg=true)](https://ci.appveyor.com/project/Apiary/dredd/branch/master)
[![Dependency Status](https://david-dm.org/apiaryio/dredd.svg)](https://david-dm.org/apiaryio/dredd)
[![devDependency Status](https://david-dm.org/apiaryio/dredd/dev-status.svg)](https://david-dm.org/apiaryio/dredd?type=dev)
[![Greenkeeper badge](https://badges.greenkeeper.io/apiaryio/dredd.svg)](https://greenkeeper.io/)
[![Documentation Status](https://readthedocs.org/projects/dredd/badge/?version=latest)](https://readthedocs.org/projects/dredd/builds/)
[![Coverage Status](https://coveralls.io/repos/apiaryio/dredd/badge.svg?branch=master)](https://coveralls.io/github/apiaryio/dredd)
[![Known Vulnerabilities](https://snyk.io/test/npm/dredd/badge.svg)](https://snyk.io/test/npm/dredd)

![Dredd - HTTP API Testing Framework](docs/_static/images/dredd.png?raw=true)

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
- [OpenAPI 2][] (formerly known as Swagger)
- [OpenAPI 3][] ([experimental](https://github.com/apiaryio/api-elements.js/blob/master/packages/fury-adapter-oas3-parser/STATUS.md), contributions welcome!)

### Supported Hooks Languages

Dredd supports writing [hooks](https://dredd.org/en/latest/hooks/)
— a glue code for each test setup and teardown. Following languages are supported:

- [Go](https://dredd.org/en/latest/hooks-go/)
- [Node.js (JavaScript)](https://dredd.org/en/latest/hooks-nodejs/)
- [Perl](https://dredd.org/en/latest/hooks-perl/)
- [PHP](https://dredd.org/en/latest/hooks-php/)
- [Python](https://dredd.org/en/latest/hooks-python/)
- [Ruby](https://dredd.org/en/latest/hooks-ruby/)
- [Rust](https://dredd.org/en/latest/hooks-rust/)
- Didn't find your favorite language? _[Add a new one!](https://dredd.org/en/latest/hooks-new-language/)_

### Supported Systems

- Linux, macOS, Windows, ...
- [Travis CI][], [CircleCI][], [Jenkins][], [AppVeyor][], ...

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


## Howtos, Tutorials, Blogposts (3rd party)

- [Testing your API with Dredd](https://medium.com/mop-developers/testing-your-api-with-dredd-c02e6ca151f2) *9/27/2018*
- [Writing Testable API Documentation Using APIB and Dredd (Rails)](https://blog.rebased.pl/2018/06/29/testable-api-docs.html) *6/29/2018*
- [Design-first API Specification Workflow Matures](https://philsturgeon.uk/api/2018/03/01/api-specification-workflow-matures/) *3/1/2018*
- [Writing and testing API specifications with API Blueprint, Dredd and Apiary](https://hackernoon.com/writing-and-testing-api-specifications-with-api-blueprint-dreed-and-apiary-df138accce5a) *12/04/2017*
- [Testing an API Against its Documentation](https://dev.to/albertofdzm/testing-an-api-against-documentation-6cl) *11/23/2017*
- [Keeping Documentation Honest](https://blog.apisyouwonthate.com/keeping-documentation-honest-d9ab5351ddd4) *11/21/2017*
- [Apiary designed APIs tested using Dredd](https://redthunder.blog/2017/09/20/apiary-designed-apis-tested-using-dredd/) *09/20/2017*
- [Dredd + Swagger for REST API testing](https://codeburst.io/dredd-swagger-for-rest-api-testing-715d1af5e8c5) *01/24/2017*
- [Testing Your API Documentation With Dredd](https://matthewdaly.co.uk/blog/2016/08/08/testing-your-api-documentation-with-dredd/) *08/08/2016*
- [DREDD API Tester works with API Blueprints](http://www.finklabs.org/articles/api-blueprint-dredd.html) *07/05/2016*
- [Documentation driven API Development using Laravel, Dredd and Apiary](https://medium.com/frianbiz/api-php-pilot%C3%A9e-par-la-doc-3c9eb4daa2aa) *06/21/2016*
- [Dredd v1.1.0: A Bit Different](https://philsturgeon.uk/api/2016/06/20/dredd-v1-1-0-a-bit-different/) *06/20/2016*
- [Dredd: Do Your HTTP API Justice](https://philsturgeon.uk/api/2015/01/28/dredd-api-testing-documentation/) *01/28/2015*



[API Blueprint]: https://apiblueprint.org/
[API Blueprint tutorial]: https://apiblueprint.org/documentation/tutorial.html
[API Blueprint examples]: https://github.com/apiaryio/api-blueprint/tree/master/examples
[OpenAPI 2]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md
[OpenAPI 3]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md

[Documentation]: https://dredd.org/en/latest/
[Changelog]: https://github.com/apiaryio/dredd/releases
[Contributor's Guidelines]: https://dredd.org/en/latest/contributing/

[Travis CI]: https://travis-ci.org/
[CircleCI]: https://circleci.com/
[Jenkins]: https://jenkins.io/
[AppVeyor]: https://www.appveyor.com/
