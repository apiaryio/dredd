# Contributing Guidelines

## Quick Start

### Ideas

- File an [issue][issues].
- Explain why you want the feature. How does it help you? What for do you want the feature?

### Bugs

- File an [issue][issues].
- Ideally, write a failing test and send it as a Pull Request.

### Coding

- Dredd is written in [CoffeeScript][].
- Dredd uses [Semantic Release and Conventional Changelog](#sem-rel).

#### Recommended Workflow

1. Fork Dredd.
2. Create a feature branch.
3. Write tests.
4. Write code.
5. Send a Pull Request.
6. Make sure [test coverage][] didn't drop and all CI builds are passing.

<a name="sem-rel">
#### Semantic Release and Conventional Changelog

To make [Semantic Release][] and [Conventional Changelog][] work, all commit messages
in the project should follow the Conventional Changelog format. If you're new to the
concept, just make sure your commit messages look like this:

```
<type>: <subject>
```

Where `<type>` is:

- `feat` - New functionality added
- `fix` - Broken functionality fixed
- `perf` - Performance improved
- `docs` - Documentation added/removed/improved/...
- `chore` - Package setup, CI setup, ...
- `refactor` - Changes in code, but no changes in behavior
- `test` - Tests added/removed/improved/...

See [existing commits][] as a reference. The [Commitizen CLI][] can also help you.

Semantic Release will make sure correct version numbers get bumped according
to the **meaning** of your changes once your PR gets merged to `master`.
Semantic Release then also automatically releases new Dredd to npm.

In the rare cases when your changes break backwards compatibility, the message
must include words `BREAKING CHANGE`. That will result in bumping the major version.

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

Releasing process for standard versions is currently automated by [Semantic Release][]. Releasing process for pre-releases is not automated and needs to be done manually, ideally from a special git branch.

### Testing

Use `npm test` to run all tests. Dredd uses [Mocha][] as a test framework.
It's default options are in the `test/mocha.opts` file.

### Integration Tests of Hooks Handlers

Every Pull Request spawns dependent integration builds of hook handlers. Thanks
to this, author of the PR can be sure they did not break hook handler
implementations by the changes.

The script `scripts/test-hooks-handlers.coffee` is automatically ran by
Travis CI in one of the jobs in the build matrix every time the tested commit
is part of a PR. Head to the [script code][scripts/test-hooks-handlers.coffee]
to understand how it works. It's thoroughly documented.

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

Changelog is in form of [GitHub Releases][]. Currently it's automatically
generated by [Semantic Release][]. See [above](#sem-rel) to learn
about how it works.

### Documentation

The main documentation is written in [Markdown][] using [MkDocs][]. Dredd uses
[ReadTheDocs][] to build and publish the documentation:

- [https://dredd.readthedocs.io](https://dredd.readthedocs.io) - preferred long URL
- [http://dredd.rtfd.org](http://dredd.rtfd.org) - preferred short URL

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

Following data are sent over the wire to Apiary:

- [Apiary Reporter Test Data](data-structures.md#apiary-reporter-test-data)

There is also one environment variable you could find useful:

- `APIARY_API_URL='https://api.apiary.io'` - Allows to override host of the Apiary Tests API.


[Apiary]: https://apiary.io/

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
[Semantic Release]: https://github.com/semantic-release/semantic-release
[Conventional Changelog]: https://github.com/conventional-changelog/conventional-changelog-angular/blob/master/convention.md
[Commitizen CLI]: https://github.com/commitizen/cz-cli

[existing commits]: https://github.com/apiaryio/dredd/commits/master
[docs]: https://github.com/apiaryio/dredd/tree/master/docs
[coffeelint.json]: https://github.com/apiaryio/dredd/tree/master/coffeelint.json
[GitHub Releases]: https://github.com/apiaryio/dredd/releases

[upstream repository]: https://github.com/apiaryio/dredd
[issues]: https://github.com/apiaryio/dredd/issues

[Apiary Tests API for anonymous test reports]: https://github.com/apiaryio/dredd/blob/master/ApiaryReportingApiAnonymous.apib
[Apiary Tests API for authenticated test reports]: https://github.com/apiaryio/dredd/blob/master/ApiaryReportingApi.apib
