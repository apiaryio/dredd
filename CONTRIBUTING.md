# Contributing Guidelines

If you are in hurry, just please scan the **Quick Start** section.

## Quick Start

### Ideas, bugs...

- File an [issue][issues].
- [API Blueprint][] prepares direct support for testing and scenarios. Interested?
  Check out [apiaryio/api-blueprint#21](https://github.com/apiaryio/api-blueprint/issues/21)!

### Coding

- Dredd is written in [CoffeeScript][].
- There's [ready-made virtual machine][vde] to get you started very quickly.

Recommended workflow:

1. Fork Dredd, create a feature branch.
2. Write tests, use `npm run tests:bdd`.
3. Write code.
4. Make sure [test coverage][] didn't drop.
5. Send a Pull Request.

## Handbook for Contributors and Maintainers

### Maintainers

[Apiary][] is the main author and maintainer of Dredd's [upstream repository][].
Currently responsible people are:

- [@netmilk](https://github.com/netmilk) - product decisions, feature requests
- [@honzajavorek](https://github.com/honzajavorek) - lead of development

### Programming Language

Dredd is written in [CoffeeScript][] and is meant to be ran on server using
Node.js. Before publishing to npm registry, it is compiled to plain
ES5 JavaScript code (throwaway `lib` directory).

While tests are compiled on-the-fly thanks to CoffeeScript integration with
the Mocha test framework, they actually need the code to be also pre-compiled
every time because some integration tests use code linked from `lib`. This is
certainly a flaw and it slows down day-to-day development, but unless we find
out how to get rid of the `lib` dependency, it's necessary.

Also mind that CoffeeScript is production dependency (not dev dependency),
because it's needed not only for compiling Dredd package before uploading
to npm, but also for running user-provided hooks written in CoffeeScript.

### Versioning

Dredd follows [Semantic Versioning][]. To ensure certain stability of Dredd installations (e.g. in CI builds), users can pin their version. They can also use release tags:

- `npm install dredd` - Installs the latest published version including experimental pre-release versions.
- `npm install dredd@stable` - Skips experimental pre-release versions. Recommended for CI installations.

When releasing, make sure you respect the tagging:

- To release pre-release, e.g. `42.1.0-pre.7`, use just `npm publish`.
- To release any other version, e.g. `42.1.0`, use `npm publish && npm dist-tag add dredd@42.1.0 stable`.

Hopefully this will be automated one day.

### Testing

Use `npm run test` or just `npm test` to run all tests. Use `npm run test:bdd`
to run tests and watch for changes. Dredd uses [Mocha][] as a test framework.
It's default options are in the `test/mocha.opts` file.

If you experience a flaky test, you can use `npm run test:stress` in combination
with `describe.only` to try to replicate the flaky behavior.

### Linting

Dredd uses [coffeelint][] to lint the CoffeeScript codebase. There is a plan
to converge with Apiary's [CoffeeScript Style Guide][], but as most of
the current code was written before the style guide was introduced, it's
a long run. The effective settings are in the [coffeelint.json][] file.

Linter is optional for local development to make easy prototyping and work
with unpolished code, but it's enforced on CI level. It is recommended you
integrate coffeelint with your favorite editor so you see violations
immediately during coding.

### Changelog

[Changelog][] is maintained manually. To update it,

1.  use the `npm run changelist` to generate `CHANGELOG-Generated.md` file from
    Pull Requests merged into `master`.
2.  Take a look on what has been generated and craft yourself a nice manual
    update to `CHANGELOG.md`. Make it easily readable and stress achieved goals.

### Documentation

The main documentation is written in [Markdown][] using [MkDocs][]. Dredd uses
[ReadTheDocs][] to build and publish the documentation:

- https://dredd.readthedocs.io/ - preferred long URL
- http://dredd.rtfd.org/ - preferred short URL

Source of the documentation can be found in the [docs][] directory. To contribute to Dredd's documentation, you will need to follow the [MkDocs installation instructions](http://www.mkdocs.org/#installation). Once installed, you may use following commands:

- `npm run docs:build` - Builds the documentation.
- `npm run docs:serve` - Runs live preview of the documentation.

### Coverage

Dredd strives for as much test coverage as possible. [Coveralls][] help us to
monitor how successful we are in achieving the goal. The process of collecting
coverage:

1. [coffee-coverage][] is used to instrument the CoffeeScipt code.
2. Instrumented code is copied into a separate directory. We run tests in the
   directory using Mocha with a special lcov reporter, which gives us
   information about which lines were executed in a standard lcov format.
3. Because some integration tests execute the `bin/dredd` script in
   a subprocess, we collect the coverage stats also in this file. The results
   are appended to a dedicated lcov file.
4. All lcov files are then merged into one using [lcov-result-merger][]
   and sent to Coveralls.

If a Pull Request introduces drop in coverage, it won't be accepted unless
the author or reviewer provides a good reason why an exception should be made.

### Hacking Apiary Reporter

If you want to build something on top of the Apiary Reporter, note that it uses a public API described in following documents:

- [Apiary Tests API for anonymous test reports][]
- [Apiary Tests API for authenticated test reports][]

There are also some environment variables you could find useful:

- `APIARY_API_URL='https://api.apiary.io'` - Allows to override host of the Apiary Tests API.
- `DREDD_REST_DEBUG=true` - Turns on some additional logging. Useful for debugging.


[Apiary]: https://apiary.io/
[API Blueprint]: http://apiblueprint.org/

[Semantic Versioning]: http://semver.org/
[coffee-coverage]: https://github.com/benbria/coffee-coverage
[coffeelint]: http://www.coffeelint.org/
[CoffeeScript]: http://coffeescript.org
[CoffeeScript Style Guide]: https://github.com/apiaryio/coffeescript-style-guide
[Coveralls]: https://coveralls.io/github/apiaryio/dredd
[lcov-result-merger]: https://github.com/mweibel/lcov-result-merger
[Markdown]: https://en.wikipedia.org/wiki/Markdown
[MkDocs]: http://www.mkdocs.org/
[ReadTheDocs]: https://readthedocs.org/
[test coverage]: https://coveralls.io/r/apiaryio/dredd?branch=master
[Mocha]: http://mochajs.org/

[docs]: docs
[coffeelint.json]: coffeelint.json
[Changelog]: CHANGELOG.md
[vde]: VirtualDevelopmentEnvironment.md

[upstream repository]: https://github.com/apiaryio/dredd
[issues]: https://github.com/apiaryio/dredd/issues

[Apiary Tests API for anonymous test reports]: https://github.com/apiaryio/dredd/blob/master/ApiaryReportingApiAnonymous.apib
[Apiary Tests API for authenticated test reports]: https://github.com/apiaryio/dredd/blob/master/ApiaryReportingApi.apib
