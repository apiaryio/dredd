# Installation

Dredd is a command-line application written in [CoffeeScript][], a dialect of the JavaScript programming language. To run it on your machine or in your [Continuous Integration server][CI], you first need to have [Node.js][] installed.

## Install Node.js

### macOS

1. Install Node.js.
    - If you're using [Homebrew][], run `brew install node`.
    - Otherwise [download Node.js][Download Node.js] from the official website and install Node.js using the downloaded installer.
2. Make sure both `node --version` and `npm --version` work in your Terminal.

### Windows

1. [Download Node.js][] from the official website and install Node.js using the downloaded installer.
2. Make sure both `node --version` and `npm --version` work in your Command Prompt.

### Linux

1. [Install Node.js as system package][].
2. Make sure both `node --version` and `npm --version` work in your Terminal.

### Pro Tips

- [Continuous Integration section in the How-To Guides](how-to-guides.md#continuous-integration) can help you to install Dredd on CI server.
- To maintain multiple Node.js versions on your computer, check out [nvm][].

## Install Dredd

1. `npm install -g dredd`
2. `dredd --version`

If the second command works, you're done!

> **Note:** The installation process can print several errors related to `node-gyp`. If `dredd --version` works for you after the installation ends, feel free to ignore the errors ([learn more about this](#compiled-vs-pure-javascript)).

### Globally vs locally

The `-g` ensures Dredd will be installed "globally". That means you'll be able to access it from any directory just by typing `dredd`.

If you work on projects installable by `npm`, i.e. projects containing `package.json`, you might want to have Dredd installed as a development dependency instead. Just install Dredd by `npm install dredd --save-dev`. See `package.json` of the [Dredd Example][] repository for inspiration.

### Which version?

- **For development**, always go with the latest version.
- **For testing in [CI][]**, always pin your Dredd version to a specific number and upgrade to newer releases manually.

Dredd sometimes issues a pre-release version to test experimental features or to ensure that significant internal revamp of existing features didn't cause any regressions. It's possible to use `npm install dredd@stable` to avoid installing the pre-release versions. However, for most of the time, there are no pre-releases and the `stable` tag just points to the latest version.

### Windows Support

While Dredd seems to work on Windows for many users, the platform **isn't officially supported yet**. Dredd should correctly install and run on Windows, but it's not tested on Windows at all. Also, there are [several known limitations][Windows Issues]:

- only JavaScript hooks work
- problems with Windows/UNIX newlines when using API Blueprint
- problems with running subprocesses
- problems developing Dredd or running Dredd's test suite on Windows

Windows support [is planned](https://github.com/apiaryio/dredd/issues/204). As an **experimental** prove that Dredd executes on Windows, the [Dredd Example][] repository features also one Windows-based CI, [AppVeyor][].

### Compiled vs pure JavaScript

Dredd uses [Drafter][] for parsing [API Blueprint][] documents. Drafter is written in C++11 and needs to be compiled during installation. Since that can be problematic for some environments and leads to a lot of troubleshooting, there's also pure JavaScript version of the parser, [drafter.js][]. While drafter.js is fully equivalent, it can have slower performance. That's why there's [drafter-npm][] package, which first tries to compile the C++11 version of the parser and if it's unsuccessful, uses the JavaScript equivalent.

Dredd depends on the [drafter-npm][] package. That's why you can see `node-gyp` errors and failures during Dredd installation, although after the installation is done, Dredd seems to normally work and correctly parses API Blueprint documents. Usual problems leading to the JavaScript version of the parser being used as fallback:

- **Your machine is missing a C++11 compiler.** See how to fix this on [Windows](Windows C++11) or [Travis CI][Travis CI C++11].
- **npm was used with Python 3.** `node-gyp`, which performs the compilation, doesn't support Python 3. If your default Python is 3 (see `python --version`), [tell npm to use an older version][npm Python].
- The `protagonist` package got manually deleted from Dredd's `node_modules` directory. This usually doesn't happen as an accident, it's basically a hack how to force the JavaScript version regardless your environment.

To force the JavaScript version of Drafter and avoid any compilation attempts, use `npm install dredd --no-optional` when installing Dredd.


[API Blueprint]: https://apiblueprint.org/
[CoffeeScript]: http://coffeescript.org/
[CI]: how-to-guides.md#continuous-integration
[Dredd Example]: https://github.com/apiaryio/dredd-example

[AppVeyor]: http://appveyor.com/
[Windows Issues]: https://github.com/apiaryio/dredd/issues?utf8=%E2%9C%93&q=is%3Aissue%20is%3Aopen%20label%3AWindows%20

[Homebrew]: http://brew.sh/
[Node.js]: https://nodejs.org/en/
[nvm]: https://github.com/creationix/nvm
[Download Node.js]: https://nodejs.org/en/#download
[Install Node.js as system package]: https://nodejs.org/en/download/package-manager/

[Drafter]: https://github.com/apiaryio/drafter
[drafter.js]: https://github.com/apiaryio/drafter.js
[drafter-npm]: https://github.com/apiaryio/drafter-npm/
[Windows C++11]: https://github.com/apiaryio/drafter/wiki/Building-on-Windows
[Travis CI C++11]: https://github.com/apiaryio/protagonist/blob/master/.travis.yml
[npm Python]: http://stackoverflow.com/a/22433804/325365
