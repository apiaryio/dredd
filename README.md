# Dredd—API Blueprint Testing Tool

[![Build Status](https://travis-ci.org/apiaryio/dredd.png?branch=master)](https://travis-ci.org/apiaryio/dredd)
[![Dependency Status](https://david-dm.org/apiaryio/dredd.png)](https://david-dm.org/apiaryio/dredd)
[![devDependency Status](https://david-dm.org/apiaryio/dredd/dev-status.png)](https://david-dm.org/apiaryio/dredd#info=devDependencies)
[![Coverage Status](https://coveralls.io/repos/apiaryio/dredd/badge.png?branch=master)](https://coveralls.io/r/apiaryio/dredd?branch=master)


Dredd is a command-line tool for testing API documentation written in [API Blueprint][] format against its backend implementation. With Dredd you can easily plug your API documentation into the Continous Integration system like [Travis CI][] or [Jenkins][] and have API documentation up-to-date, all the time. Dredd uses the [Gavel][] for judging if a particular API response is valid or if is not. If you are curious about how decisions are made, please refer to Gavel's [behavior specification][].

![Dredd API Blueprint testing tool](https://raw.github.com/apiaryio/dredd/master/img/Dredd.png)

## Get Started Testing Your API

    $ dredd blueprint.md http://api.myservice.tld

See [dredd-example](https://github.com/apiaryio/dredd-example) repo for real-life example.

## Installation
[Node.js][] and [NPM][] is required.

    $ npm install -g dredd

[Node.js]: https://npmjs.org/
[NPM]: https://npmjs.org/

## Command Line Options

    $ dredd --help

    dredd <path to blueprint> <api_endpoint> [OPTIONS]

    Example:
      dredd ./apiary.md http://localhost:3000 --dry-run

    Options:
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
      --version            Show version number
      --help               Show usage information

Additionally, boolean flags can be negated by prefixing `no-`, for example: `--no-color --no-inline-errors`.

## API Blueprint testability
Dredd can test only API resources specified by *well defined transaction*. Any Non specific resources in the Blueprint e. g. with URI template or query parameters without default or example values are considered as *ambiguous transaction* thus they are resulting in a *warning* during the test run and are skipped.

## Contribution

Any contribution is more then welcome! Let's start with creating your own [virtual development environment][vde], then fork, write  tests, write clean, readable code which communicate, use `scripts/bdd`, keep the [test coverage] and create a pull request. :)

Make sure to follow Dredd [issues page][issues].

[API Blueprint]: http://apiblueprint.org/
[test coverage]: https://coveralls.io/r/apiaryio/dredd?branch=master
[Travis CI]: https://travis-ci.org/
[Jenkins]: http://jenkins-ci.org/
[Gavel]: http://blog.apiary.io/2013/07/24/Bam-this-is-Gavel/
[behavior specification]: https://www.relishapp.com/apiary/gavel/docs
[vde]: https://github.com/apiaryio/dredd/blob/master/VirtualDevelopmentEnvironment.md
[issues]: https://github.com/apiaryio/dredd/issues?state=open
