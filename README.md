# Dredd—API Blueprint Testing Tool

[![Build Status](https://travis-ci.org/apiaryio/dredd.png?branch=master)](https://travis-ci.org/apiaryio/dredd)
[![Dependency Status](https://david-dm.org/apiaryio/dredd.png)](https://david-dm.org/apiaryio/dredd)
[![devDependency Status](https://david-dm.org/apiaryio/dredd/dev-status.png)](https://david-dm.org/apiaryio/dredd#info=devDependencies)
[![Coverage Status](https://coveralls.io/repos/apiaryio/dredd/badge.png?branch=master)](https://coveralls.io/r/apiaryio/dredd?branch=master)


Dredd is a command-line tool for testing API documentation written in [API Blueprint][] format against its backend implementation. With Dredd you can easily plug your API documentation into the Continous Integration system like [Travis CI][] or [Jenkins][] and have API documentation up-to-date, all the time. Dredd uses the [Gavel][] for judging if a particular API response is valid or if is not. If you are curious about how decisions are made, please refer to Gavel's [behavior specification][].

![Dredd API Blueprint testing tool](https://raw.github.com/apiaryio/dredd/master/img/Dredd.png?login=netmilk&token=5353a4150671cc21623b2a42354c0fdb)

## Get Started Testing Your API

    $ dredd blueprint.md http://api.myservice.tld

See [dredd-example](https://github.com/apiaryio/dredd-example) repo for real-life example.

## Installation
[Node.js][] and [NPM][] is required.

    $ npm install -g dredd

[Node.js]: https://npmjs.org/
[NPM]: https://npmjs.org/

## Command Line Options

    $ dredd -h

    Usage:
      dredd <path to blueprint> <api_endpoint> [OPTIONS]

    Example:
      dredd ./apiary.md http://localhost:3000 --dry-run

    Options:
      -d, --dry-run          Run without performing tests.
      -s, --silent           Suppress all command line output
      -r, --reporter STRING  Output additional report format. Options: junit
      -o, --output FILE      Specifies output file when using additional
                             reporter
      -k, --no-color         Omit color from output
          --debug            Show debug information
      -v, --version          Display the current version
      -h, --help             Display help and usage details

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