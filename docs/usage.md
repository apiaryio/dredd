# Using Dredd

Dredd may be configured from the command line, from a configuration, or from the JavaScript code.

## CLI interface

To see how to use the CLI interface, type `dredd --help` at the command line.

```
Usage:
  $ dredd init

Or:
  $ dredd <path or URL to blueprint> <api_endpoint> [OPTIONS]

Example:
  $ dredd ./apiary.md http://localhost:3000 --dry-run

Options:
  --dry-run, -y                      Do not run any real HTTP transaction, only
                                     parse blueprint and compile transactions.
                                                                 [default: null]
  --hookfiles, -f                    Specifies a pattern to match files with
                                     before/after hooks for running tests
                                                                 [default: null]
  --language, -a                     Language of hookfiles. Possible options
                                     are: nodejs, ruby, python, php, perl, go
                                                             [default: "nodejs"]
  --sandbox, -b                      Load and run non trusted hooks code in
                                     sandboxed container        [default: false]
  --server, -g                       Run API backend server command and kill it
                                     after Dredd execution. E.g. `rails server`
                                                                 [default: null]
  --server-wait                      Set delay time in seconds between running
                                     a server and test run.         [default: 3]
  --init, -i                         Run interactive configuration. Creates
                                     dredd.yml configuration file.
                                                                [default: false]
  --custom, -j                       Pass custom key-value configuration data
                                     delimited by a colon. E.g. -j 'a:b'
                                                                   [default: []]
  --names, -n                        Only list names of requests (for use in a
                                     hookfile). No requests are made.
                                                                [default: false]
  --only, -x                         Run only specified transaction name. Can
                                     be used multiple times        [default: []]
  --reporter, -r                     Output additional report format. This
                                     option can be used multiple times to add
                                     multiple reporters. Options: junit, nyan,
                                     dot, markdown, html, apiary.
                                                                   [default: []]
  --output, -o                       Specifies output file when using
                                     additional file-based reporter. This
                                     option can be used multiple times if
                                     multiple file-based reporters are used.
                                                                   [default: []]
  --header, -h                       Extra header to include in every request.
                                     This option can be used multiple times to
                                     add multiple headers.
                                                                   [default: []]
  --sorted, -s                       Sorts requests in a sensible way so that
                                     objects are not modified before they are
                                     created. Order: CONNECT, OPTIONS, POST,
                                     GET, HEAD, PUT, PATCH, DELETE, TRACE.
                                                                [default: false]
  --user, -u                         Basic Auth credentials in the form
                                     username:password.
                                                                 [default: null]
  --inline-errors, -e                Determines whether failures and errors are
                                     displayed as they occur (true) or
                                     aggregated and displayed at the end
                                     (false).
                                                                [default: false]
  --details, -d                      Determines whether request/response
                                     details are included in passing tests.
                                                                [default: false]
  --method, -m                       Restrict tests to a particular HTTP method
                                     (GET, PUT, POST, DELETE, PATCH). This
                                     option can be used multiple times to allow
                                     multiple methods.
                                                                   [default: []]
  --color, -c                        Determines whether console output should
                                     include colors.
                                                                 [default: true]
  --level, -l                        The level of logging to output. Options:
                                     silly, debug, verbose, info, warn, error.
                                                               [default: "info"]
  --timestamp, -t                    Determines whether console output should
                                     include timestamps.
                                                                [default: false]
  --silent, -q                       Silences commandline output.
                                                                [default: false]
  --path, -p                         Additional blueprint paths or URLs. Can be
                                     used multiple times with glob pattern for
                                     paths.                        [default: []]
  --help                             Show usage information.

  --version                          Show version number.

  --hooks-worker-timeout             How long to wait for hooks worker to start.
                                                                 [default: 5000]
  --hooks-worker-connect-timeout     How long to wait for hooks worker to
                                     acknowledge connection.     [default: 1500]
  --hooks-worker-connect-retry       How long to wait between attempts to
                                     connect to hooks worker.     [default: 500]
  --hooks-worker-after-connect-wait  How long to wait between connecting to
                                     hooks worker and start of testing.
                                                                  [default: 100]
  --hooks-worker-term-timeout        How long to wait between trying to
                                     terminate hooks worker and killing it.
                                                                 [default: 5000]
  --hooks-worker-term-retry          How long to wait between attempts to
                                     terminate hooks worker.      [default: 500]
  --hooks-worker-handler-host        Host of the hook worker.
                                                          [default: "localhost"]
  --hooks-worker-handler-port        Port of the hook worker.   [default: 61321]
```

### Dredd Configuration File

Configuration for Dredd may be stored in a configuration file named `dredd.yml`.

Command-line interface uses `dredd.yml` configuration file to persist configuration.
Its structure is same as [Configuration object for Dredd Class](#configuration-object-for-dredd-class).

Example dredd.yml configuration:

```yaml
reporter: apiary
custom:
  - "apiaryApiKey:yourSecretApiaryAPiKey"
  - "apiaryApiName:apiName"
dry-run: null
hookfiles: "dreddhooks.js"
sandbox: false
server: rails server
server-wait: 3
init: false
custom: {}
names: false
only: []
output: []
header: []
sorted: false
user: null
inline-errors: false
details: false
method: []
level: info
timestamp: false
silent: false
path: []
blueprint: apiary.apib
endpoint: "http://localhost:3000"
```

## Configuring in JavaScript

You can use Dredd from your JavaScript environment directly,
not only via [CLI](http://en.wikipedia.org/wiki/Command-line_interface).

```javascript
var Dredd = require('dredd');

var dredd = new Dredd(configuration);
```

Then you need to run the Dredd Testing. So do it.

```javascript
dredd.run(function (err, stats) {
  // err is present if anything went wrong
  // otherwise stats is an object with useful statistics
});
```

As you can see, `dredd.run` is a function receiving another function as a callback.
Received arguments are `err` (error if any) and `stats` (testing statistics) with
numbers accumulated throughout the Dredd run.


### Configuration Object for Dredd Class

Let's have a look at an example configuration first. (Please also see [options source](https://github.com/apiaryio/dredd/blob/master/src/options.coffee) to read detailed information about the `options` attributes).

```javascript
{
  server: 'http://localhost:3000/api', // your URL to API endpoint the tests will run against
  options: {

    'path': [],       // Required Array if Strings; filepaths to API Blueprint files, can use glob wildcards

    'dry-run': false, // Boolean, do not run any real HTTP transaction
    'names': false,   // Boolean, Print Transaction names and finish, similar to dry-run

    'level': 'info', // String, log-level (info, silly, debug, verbose, ...)
    'silent': false, // Boolean, Silences all logging output

    'only': [],      // Array of Strings, run only transaction that match these names

    'header': [],    // Array of Strings, these strings are then added as headers (key:value) to every transaction
    'user': null,    // String, Basic Auth credentials in the form username:password

    'hookfiles': [], // Array of Strings, filepaths to files containing hooks (can use glob wildcards)

    'reporter': ['dot', 'html'], // Array of possible reporters, see folder src/reporters

    'output': [],     // Array of Strings, filepaths to files used for output of file-based reporters

    'inline-errors': false, // Boolean, If failures/errors are display immediately in Dredd run

    'color': true,
    'timestamp': false
  },

  'emitter': EventEmitterInstance, // optional - listen to test progress, your own instance of EventEmitter

  'hooksData': {
    'pathToHook' : '...'
  }

  'data': {
    'path/to/file': '...'
  }
}
```

### Properties

#### server (string)

Your choice of the API endpoint to test the API Blueprint against.
It must be a valid URL (you can specify `port`, `path` and http or https `protocol`).

#### options (object)

Because `options.path` array is required, you must specify options. You'll end
with errors otherwise.

##### options.path (object)

__Required__ Array of filepaths to API Blueprint files. Or it can also be an URL to download the API Blueprint from internet via http(s) protocol.

##### data (object)

__Optional__ Object with keys as `filename` and value as `blueprint`-code.

Useful when you don't want to operate on top of filesystem and want to pass
code of your API Blueprints as a string. You get the point.

##### hooksData (object)

__Optional__ Object with keys as `filename` and strings with JavaScript hooks code.

Load hooks file code from string. Must be used together with sandboxed mode.

```javascript
{
  'data': {
    './file/path/blueprint.apib': 'FORMAT: 1A\n\n# My String API\n\nGET /url\n+ Response 200\n\n        Some content',
    './another/file.apib': '# Another API\n\n## Group Machines\n\n### Machine [/machine]\n\n#### Read machine [GET]\n\n...'
  }
}
```

## Dredd Execution Lifecycle

This section provides the order in which Dredd executes to give a better understanding of how Dredd works.

1. Load and parse blueprints
    - Report parsing warnings
2. Pre-run blueprint check
    - Missing example values for URI template parameters
    - Required parameters present in URI
    - Report non-parseable JSON bodies
    - Report invalid URI parameters
    - Report Invalid URI templates
3. Compile HTTP transactions from blueprints
    - Inherit headers
    - Inherit parameters
    - Expand URI templates with parameters
4. Load hooks
5. Test run
    - Report test run `start`
    - Run `beforeAll` hooks
    - For each compiled transaction:
        - Report `test start`
        - Run `beforeEach` hook
        - Run `before` hook
        - Send HTTP request
        - Receive HTTP response
        - Run `beforeEachValidation` hook
        - Run `beforeValidation` hook
        - Perform [Gavel][] validation
        - Run `after` hook
        - Run `afterEach` hook
        - Report `test end` with result for in-progress reporting
    - Run `afterAll` hooks
6. Report test run `end` with result statistics

[Gavel]: http://blog.apiary.io/2013/07/24/Bam-this-is-Gavel/
