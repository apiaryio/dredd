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

## Handbook for Contributers and Maintainers

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

- https://dredd.readthedocs.org/ - preferred long URL
- http://dredd.rtfd.org/ - preferred short URL

Source of the documentation can be found in the [docs][] directory. To contribute to Dredd's documentation, you will need to follow the [MkDocs installation instructions](http://www.mkdocs.org/#installation). Once installed, you may use `mkdocs serve` from the Dredd directory to run the local server for the documentation.

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


[Apiary]: https://apiary.io/
[API Blueprint]: http://apiblueprint.org/

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
