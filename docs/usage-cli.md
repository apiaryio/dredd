# Command-line Interface

## Usage

```
$ dredd '<API Description Document>' '<API Location>' [OPTIONS]
```

Example:

```
$ dredd ./apiary.md 'http://localhost:3000'
```

## Arguments

### API Description Document (string)

URL or path to the API description document (e.g. API Blueprint).  
**Sample values:** `./apiary.apib`, `http://example.com/apiary.apib`

### API Location (string)

URL, the root address of your API.  
**Sample values:** `http://localhost:3000`, `http://api.example.com`

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
blueprint: apiary.apib
endpoint: "http://localhost:3000"
```

## CLI Options Reference

Remember you can always list all available arguments by `dredd --help`.

### --color, -c
Determines whether console output should include colors.  
**Default value:** `true`

### --custom, -j
Pass custom key-value configuration data delimited by a colon. E.g. -j 'a:b'  
**Default value:** `[]`

### --details, -d
Determines whether request/response details are included in passing tests.  

### --dry-run, -y
Do not run any real HTTP transaction, only parse API description document and compile transactions.  

### --header, -h
Extra header to include in every request. This option can be used multiple times to add multiple headers.  
**Default value:** `[]`

### --help
Show usage information.  

### --hookfiles, -f
Specifies a pattern to match files with before/after hooks for running tests  

### --hooks-worker-after-connect-wait
How long to wait between connecting to hooks worker and start of testing. [ms]  
**Default value:** `100`

### --hooks-worker-connect-retry
How long to wait between attempts to connect to hooks worker. [ms]  
**Default value:** `500`

### --hooks-worker-connect-timeout
Total hook worker connection timeout (includes all retries). [ms]  
**Default value:** `1500`

### --hooks-worker-handler-host
Host of the hook worker.  
**Default value:** `"localhost"`

### --hooks-worker-handler-port
Port of the hook worker.  
**Default value:** `61321`

### --hooks-worker-term-retry
How long to wait between attempts to terminate hooks worker. [ms]  
**Default value:** `500`

### --hooks-worker-term-timeout
How long to wait between trying to terminate hooks worker and killing it. [ms]  
**Default value:** `5000`

### --hooks-worker-timeout
How long to wait for hooks worker to start. [ms]  
**Default value:** `5000`

### --init, -i
Run interactive configuration. Creates dredd.yml configuration file.  

### --inline-errors, -e
Determines whether failures and errors are displayed as they occur (true) or aggregated and displayed at the end (false).  

### --language, -a
Language of hookfiles. Possible options are: nodejs, ruby, python, php, perl, go  
**Default value:** `"nodejs"`

### --level, -l
The level of logging to output. Options: silly, debug, verbose, info, warn, error.  
**Default value:** `"info"`

### --method, -m
Restrict tests to a particular HTTP method (GET, PUT, POST, DELETE, PATCH). This option can be used multiple times to allow multiple methods.  
**Default value:** `[]`

### --names, -n
Only list names of requests (for use in a hookfile). No requests are made.  

### --only, -x
Run only specified transaction name. Can be used multiple times  
**Default value:** `[]`

### --output, -o
Specifies output file when using additional file-based reporter. This option can be used multiple times if multiple file-based reporters are used.  
**Default value:** `[]`

### --path, -p
Additional API description paths or URLs. Can be used multiple times with glob pattern for paths.  
**Default value:** `[]`

### --reporter, -r
Output additional report format. This option can be used multiple times to add multiple reporters. Options: junit, nyan, dot, markdown, html, apiary.  
**Default value:** `[]`

### --sandbox, -b
Load and run non trusted hooks code in sandboxed container  

### --server, -g
Run API backend server command and kill it after Dredd execution. E.g. `rails server`  

### --server-wait
Set delay time in seconds between running a server and test run.  
**Default value:** `3`

### --silent, -q
Silences commandline output.  

### --sorted, -s
Sorts requests in a sensible way so that objects are not modified before they are created. Order: CONNECT, OPTIONS, POST, GET, HEAD, PUT, PATCH, DELETE, TRACE.  

### --timestamp, -t
Determines whether console output should include timestamps.  

### --user, -u
Basic Auth credentials in the form username:password.  

### --version
Show version number.  

