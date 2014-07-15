# Dredd—API Blueprint Testing Tool

[![Build Status](https://travis-ci.org/apiaryio/dredd.png?branch=master)](https://travis-ci.org/apiaryio/dredd)
[![Dependency Status](https://david-dm.org/apiaryio/dredd.png)](https://david-dm.org/apiaryio/dredd)
[![devDependency Status](https://david-dm.org/apiaryio/dredd/dev-status.png)](https://david-dm.org/apiaryio/dredd#info=devDependencies)
[![Coverage Status](https://coveralls.io/repos/apiaryio/dredd/badge.png?branch=master)](https://coveralls.io/r/apiaryio/dredd?branch=master)

[![NPM](https://nodei.co/npm/dredd.png)](https://nodei.co/npm/dredd/)

Dredd is a command-line tool for testing API documentation written in [API Blueprint][] format against its backend implementation. With Dredd you can easily plug your API documentation into the Continous Integration system like [Travis CI][] or [Jenkins][] and have API documentation up-to-date, all the time. Dredd uses the [Gavel][] for judging if a particular API response is valid or if is not. If you are curious about how decisions are made, please refer to Gavel's [behavior specification][].

![Dredd API Blueprint testing tool](https://raw.github.com/apiaryio/dredd/master/img/Dredd.png)

## Installation
[Node.js][] and [NPM][] is required.

    $ npm install -g dredd

[Node.js]: https://npmjs.org/
[NPM]: https://npmjs.org/

## Get Started Testing Your API

    $ dredd blueprint.md http://api.myservice.tld

See [dredd-example](https://github.com/apiaryio/dredd-example) repo for real-life example.

## Writing testable blueprints

If you are using [URI templates][URIt] in your blueprint, you have to provide default or example values in the blueprint [URI parameter syntax][UPS] to provide values for URI parameter substitution. Every resource in the blueprint defined by URI template without default values is not testable, it's considered as an ambigous transaction and skipped. In case of any ambigous transactuion Dredd will throw a warning and let you know which parameter example value is not defined in the blueprint. 

[UPS]: https://github.com/apiaryio/api-blueprint/blob/master/API%20Blueprint%20Specification.md#def-uriparameters-section
[URIt]: http://tools.ietf.org/html/rfc6570

## Hooks

Dredd can be configured to use hookfiles to do basic setup/teardown between tests (specified with the --hookfiles flag). Hookfiles can be in javascript or coffeescript, and must import the hook methods.

Requests are identified by their name, which is derived from the structure of the blueprint. You can print a list of the generated names with --names.

### Example

Get Names:

```sh
$ dredd single_get.md http://machines.apiary.io --names
info: Machines > Machines collection > Get Machines
```

Write a hookfile:

```coffee
{before, after} = require 'hooks'

before "Machines > Machines collection > Get Machines", (transaction) ->
  console.log "before"

after "Machines > Machines collection > Get Machines", (transaction) ->
  console.log "after"
```

Run tests:

```sh
dredd single_get.md http://machines.apiary.io --hookfiles=*_hooks.*
```

## Command Line Options

    $ dredd --help
    Usage:
      dredd <path to blueprint> <api_endpoint> [OPTIONS]

    Example:
      dredd ./apiary.md http://localhost:3000 --dry-run

    Options:
      --hookfiles, -f      Specifes a pattern to match files with before/after
                           hooks for running tests                   [default: null]
      --names, -n          Only list names of requests (for use in a hookfile). No
                           requests are made.                       [default: false]
      --reporter, -r       Output additional report format. This option can be used
                           multiple times to add multiple reporters. Options:
                           junit, nyan, dot, markdown, html.
                                                                       [default: []]
      --output, -o         Specifies output file when using additional file-based
                           reporter. This option can be used multiple times if
                           multiple file-based reporters are used.
                                                                       [default: []]
      --header, -h         Extra header to include in every request. This option
                           can be used multiple times to add multiple headers.
                                                                       [default: []]
      --sorted, -s         Sorts requests in a sensible way so that objects are not
                           modified before they are created. Order: CONNECT,
                           OPTIONS, POST, GET, HEAD, PUT, PATCH, DELETE, TRACE.
                                                                    [default: false]
      --user, -u           Basic Auth credentials in the form username:password.
                                                                     [default: null]
      --inline-errors, -e  Determines whether failures and errors are displayed as
                           they occur (true) or agregated and displayed at the end
                           (false).
                                                                    [default: false]
      --details, -d        Determines whether request/response details are included
                           in passing tests.
                                                                    [default: false]
      --method, -m         Restrict tests to a particular HTTP method (GET, PUT,
                           POST, DELETE, PATCH). This option can be used multiple
                           times to allow multiple methods.
                                                                       [default: []]
      --color, -c          Determines whether console output should include colors.
                                                                     [default: true]
      --level, -l          The level of logging to output. Options: silly, debug,
                           verbose, info, warn, error.
                                                                   [default: "info"]
      --timestamp, -t      Determines whether console output should include
                           timestamps.
                                                                    [default: false]
      --help               Show usage information.
      --version            Show version number.

Additionally, boolean flags can be negated by prefixing `no-`, for example: `--no-color --no-inline-errors`.

## Contribution

Any contribution is more then welcome! Let's start with creating your own [virtual development environment][vde], then fork, write  tests, write clean, readable code which communicate, use `scripts/bdd`, keep the [test coverage] and create a pull request. :)

Make sure to follow Dredd [issues page][issues].

To learn more about the future of API Blueprint & Testing visit [apiaryio/api-blueprint#21](https://github.com/apiaryio/api-blueprint/issues/21).

[API Blueprint]: http://apiblueprint.org/
[test coverage]: https://coveralls.io/r/apiaryio/dredd?branch=master
[Travis CI]: https://travis-ci.org/
[Jenkins]: http://jenkins-ci.org/
[Gavel]: http://blog.apiary.io/2013/07/24/Bam-this-is-Gavel/
[behavior specification]: https://www.relishapp.com/apiary/gavel/docs
[vde]: https://github.com/apiaryio/dredd/blob/master/VirtualDevelopmentEnvironment.md
[issues]: https://github.com/apiaryio/dredd/issues?state=open
