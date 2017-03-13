# Command-line Interface

## Usage

```
$ dredd '<API Description Document>' '<API Location>' [OPTIONS]
```

Example:

```
$ dredd ./apiary.md http://127.0.0.1:3000
```

## Arguments

### API Description Document (string)

URL or path to the API description document (API Blueprint, Swagger).<br>
**Sample values:** `./api-blueprint.apib`, `./swagger.yml`, `./swagger.json`, `http://example.com/api-blueprint.apib`

### API Location (string)

URL, the root address of your API.<br>
**Sample values:** `http://127.0.0.1:3000`, `http://api.example.com`

## Configuration File

If you use Dredd repeatedly within a single project, the preferred way to run it is to first persist your configuration in a `dredd.yml` file. With the file in place you can then run Dredd every time simply just by:

```
$ dredd
```

Dredd offers interactive wizard to setup your `dredd.yml` file:

```
$ dredd init
```

See below how sample configuration file could look like. The structure is
the same as of the [Dredd Class configuration object](usage-js.md#configuration-object-for-dredd-class).

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
blueprint: api-description.apib
endpoint: "http://127.0.0.1:3000"
```

> **Note:** Do not get confused by Dredd using a keyword `blueprint` also for paths to Swagger documents. This is for historical reasons and will be changed in the future.

## CLI Options Reference

Remember you can always list all available arguments by `dredd --help`.

### --color, -c
Determines whether console output should include colors.<br>
**Default value:** `true`

### --config
Path to dredd.yml config file.<br>
**Default value:** `"./dredd.yml"`

### --custom, -j
Pass custom key-value configuration data delimited by a colon. E.g. -j 'a:b'<br>
**Default value:** `[]`

### --details, -d
Determines whether request/response details are included in passing tests.<br>

### --dry-run, -y
Do not run any real HTTP transaction, only parse API description document and compile transactions.<br>

### --header, -h
Extra header to include in every request. This option can be used multiple times to add multiple headers.<br>
**Default value:** `[]`

### --help
Show usage information.<br>

### --hookfiles, -f
Specifies a pattern to match files with before/after hooks for running tests<br>

### --hooks-worker-after-connect-wait
How long to wait between connecting to hooks worker and start of testing. [ms]<br>
**Default value:** `100`

### --hooks-worker-connect-retry
How long to wait between attempts to connect to hooks worker. [ms]<br>
**Default value:** `500`

### --hooks-worker-connect-timeout
Total hook worker connection timeout (includes all retries). [ms]<br>
**Default value:** `1500`

### --hooks-worker-handler-host
Host of the hook worker.<br>
**Default value:** `"127.0.0.1"`

### --hooks-worker-handler-port
Port of the hook worker.<br>
**Default value:** `61321`

### --hooks-worker-term-retry
How long to wait between attempts to terminate hooks worker. [ms]<br>
**Default value:** `500`

### --hooks-worker-term-timeout
How long to wait between trying to terminate hooks worker and killing it. [ms]<br>
**Default value:** `5000`

### --hooks-worker-timeout
How long to wait for hooks worker to start. [ms]<br>
**Default value:** `5000`

### --init, -i
Run interactive configuration. Creates dredd.yml configuration file.<br>

### --inline-errors, -e
Determines whether failures and errors are displayed as they occur (true) or aggregated and displayed at the end (false).<br>

### --language, -a
Language of hookfiles. Possible options are: nodejs, ruby, python, php, perl, go<br>
**Default value:** `"nodejs"`

### --level, -l
The level of logging to output. Options: silly, debug, verbose, info, warn, error.<br>
**Default value:** `"info"`

### --method, -m
Restrict tests to a particular HTTP method (GET, PUT, POST, DELETE, PATCH). This option can be used multiple times to allow multiple methods.<br>
**Default value:** `[]`

### --names, -n
Only list names of requests (for use in a hookfile). No requests are made.<br>

### --only, -x
Run only specified transaction name. Can be used multiple times<br>
**Default value:** `[]`

### --output, -o
Specifies output file when using additional file-based reporter. This option can be used multiple times if multiple file-based reporters are used.<br>
**Default value:** `[]`

### --path, -p
Additional API description paths or URLs. Can be used multiple times with glob pattern for paths.<br>
**Default value:** `[]`

### --proxy
HTTP(S) proxy settings. Overrides `http_proxy`, `HTTP_PROXY`, `https_proxy`, `HTTPS_PROXY`, `no_proxy`, and `NO_PROXY` environment variables.<br>

### --reporter, -r
Output additional report format. This option can be used multiple times to add multiple reporters. Options: junit, nyan, dot, markdown, html, apiary.<br>
**Default value:** `[]`

### --sandbox, -b
Load and run non trusted hooks code in sandboxed container<br>

### --server, -g
Run API backend server command and kill it after Dredd execution. E.g. `rails server`<br>

### --server-wait
Set delay time in seconds between running a server and test run.<br>
**Default value:** `3`

### --silent, -q
Silences commandline output.<br>

### --sorted, -s
Sorts requests in a sensible way so that objects are not modified before they are created. Order: CONNECT, OPTIONS, POST, GET, HEAD, PUT, PATCH, DELETE, TRACE.<br>

### --timestamp, -t
Determines whether console output should include timestamps.<br>

### --user, -u
Basic Auth credentials in the form username:password.<br>

### --version
Show version number.<br>

