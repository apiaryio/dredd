# Installation

Dredd is a command-line application written in [CoffeeScript][], a dialect of the JavaScript programming language. To run it on your machine or in your [Continuous Integration server][CI], you first need to have [Node.js][] installed.

<a name="install-nodejs"></a><!-- legacy MkDocs anchor -->

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

### Globally vs locally

The `-g` ensures Dredd will be installed "globally". That means you'll be able to access it from any directory just by typing `dredd`.

If you work on projects installable by `npm`, i.e. projects containing `package.json`, you might want to have Dredd installed as a development dependency instead. Just install Dredd by `npm install dredd --save-dev`. See `package.json` of the [Dredd Example][] repository for inspiration.

### Which Version?

- **For development**, always go with the latest version.
- **For testing in [CI][]**, always pin your Dredd version to a specific number and upgrade to newer releases manually (but often!).

### Why Am I Seeing Network Errors?

In a restricted network (VPN, firewall, proxy) you can see errors similar to the following ones:

```text
npmERR! Cannot read property 'path' of null
npmERR!code ECONNRESET
npmERR!network socket hang up
```

```text
Error: Command failed: git config --get remote.origin.url
ssh: connect to host github.com port 22: Operation timed out
fatal: Could not read from remote repository.
```

To solve these issues, you need to set your proxy settings for both `npm` and `git`:

```sh
$ npm config set proxy "http://proxy.company.com:8080"
$ npm config set https-proxy "https://proxy.company.com:8080"

$ git config --global http.proxy "http://proxy.company.com:8080"
$ git config --global https.proxy "https://proxy.company.com:8080"
```

When using `git config`, make sure you have the port specified even
when it's the standard `:80`. Also check out
[how to set up Dredd to correctly work with proxies][Dredd Proxy].

### Why I'm Seeing `node-gyp` or `python` Errors?

The installation process features compilation of some C++ components, which may not be successful. In that case, errors related to `node-gyp` or `python` are printed. However, if `dredd --version` works for you when the installation is done, feel free to ignore the errors.

In case of compilation errors, Dredd automatically uses a less performant solution written in pure JavaScript. Next time when installing Dredd, you can use `npm install -g dredd --no-optional` to skip the compilation step ([learn more about this][C++11 vs JS]).

### Why Is the Installation So Slow?

The installation process features compilation of some C++ components, which may take some time ([learn more about this][C++11 vs JS]). You can simplify and speed up the process using `npm install -g dredd --no-optional` if you are:

- using Dredd exclusively with [Swagger][],
- using Dredd with small [API Bluepint][] files,
- using Dredd on Windows or other environments with complicated C++11 compiler setup.

The `--no-optional` option avoids any compilation attempts when installing Dredd, but causes slower reading of the API Blueprint files, especially the large ones.

### Windows Support

There are still [several known limitations][Windows Issues] when using Dredd on Windows, but the intention is to support it without any compromises. If you find any new issues, please [file them in the bug tracker][New Issue].


[API Blueprint]: https://apiblueprint.org/
[Swagger]: https://swagger.io/

[CoffeeScript]: http://coffeescript.org/
[CI]: how-to-guides.md#continuous-integration

[Windows Issues]: https://github.com/apiaryio/dredd/issues?utf8=%E2%9C%93&q=is%3Aissue%20is%3Aopen%20label%3AWindows%20
[New Issue]: https://github.com/apiaryio/dredd/issues/new

[Homebrew]: https://brew.sh/
[Node.js]: https://nodejs.org/en/
[nvm]: https://github.com/creationix/nvm
[Download Node.js]: https://nodejs.org/en/download/
[Install Node.js as system package]: https://nodejs.org/en/download/package-manager/

[C++11 vs JS]: contributing.md#compiled-vs-pure-javascript
[Dredd Proxy]: how-it-works.md#using-http-s-proxy
[Dredd Example]: https://github.com/apiaryio/dredd-example/
