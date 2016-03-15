options =
  "dry-run":
    alias: 'y'
    description: 'Do not run any real HTTP transaction, only parse blueprint and compile transactions.'
    default: null

  hookfiles:
    alias: 'f'
    description: 'Specifies a pattern to match files with before/after hooks for running tests'
    default: null

  language:
    alias: "a"
    description: "Language of hookfiles. Possible options are: nodejs, ruby, python, php, perl, go"
    default: "nodejs"

  sandbox:
    alias: 'b'
    description: "Load and run non trusted hooks code in sandboxed container"
    default: false

  server:
    alias: 'g'
    description: 'Run API backend server command and kill it after Dredd execution. E.g. `rails server`'
    default: null

  "server-wait":
    description: "Set delay time in seconds between running a server and test run."
    default: 3

  init:
    alias: 'i'
    description: "Run interactive configuration. Creates dredd.yml configuration file."
    default: false

  custom:
    alias: 'j'
    description: "Pass custom key-value configuration data delimited by a colon. E.g. -j 'a:b'"
    default: []

  names:
    alias: 'n'
    description: 'Only list names of requests (for use in a hookfile). No requests are made.'
    default: false

  only:
    alias: "x"
    description: "Run only specified transaction name. Can be used multiple times"
    default: []

  reporter:
    alias: "r"
    description: """Output additional report format. This option can be used \
      multiple times to add multiple reporters. \
      Options: junit, nyan, dot, markdown, html, apiary.\n"""
    default: []

  output:
    alias: "o"
    description: """
      Specifies output file when using additional file-based reporter. \
      This option can be used multiple times if multiple file-based reporters are used.\n"""
    default: []

  header:
    alias: "h"
    description: """
      Extra header to include in every request. \
      This option can be used multiple times to add multiple headers.\n"""
    default: []

  sorted:
    alias: "s"
    description: """
      Sorts requests in a sensible way so that objects are not modified before they are created. \
      Order: CONNECT, OPTIONS, POST, GET, HEAD, PUT, PATCH, DELETE, TRACE.\n"""
    default: false

  user:
    alias: "u"
    description: "Basic Auth credentials in the form username:password.\n"
    default: null

  "inline-errors":
    alias: "e"
    description: """
      Determines whether failures and errors are displayed as they \
      occur (true) or aggregated and displayed at the end (false).\n"""
    default: false

  details:
    alias: "d"
    description: "Determines whether request/response details are included in passing tests.\n"
    default: false

  method:
    alias: "m"
    description: """
      Restrict tests to a particular HTTP method (GET, PUT, POST, DELETE, PATCH). \
      This option can be used multiple times to allow multiple methods.\n"""
    default: []

  color:
    alias: "c"
    description: "Determines whether console output should include colors.\n"
    default: true

  level:
    alias: "l"
    description: "The level of logging to output. Options: silly, debug, verbose, info, warn, error.\n"
    default: "info"

  timestamp:
    alias: "t"
    description: "Determines whether console output should include timestamps.\n"
    default: false

  silent:
    alias: "q"
    description: "Silences commandline output.\n"
    default: false

  path:
    alias: "p"
    description: "Additional blueprint paths or URLs. Can be used multiple times with glob pattern for paths."
    default: []

  help:
    description: "Show usage information.\n"

  version:
    description: "Show version number.\n"

  'hooks-worker-timeout':
    description: "How long to wait for hooks worker to start."
    default: 5000

  'hooks-worker-connect-timeout':
    description: 'How long to wait for hooks worker to acknowledge connection.'
    default: 1500

  'hooks-worker-connect-retry':
    description: 'How long to wait between attempts to connect to hooks worker.'
    default: 500

  'hooks-worker-after-connect-wait':
    description: 'How long to wait between connecting to hooks worker and start of testing.'
    default: 100

  'hooks-worker-term-timeout':
    description: 'How long to wait between trying to terminate hooks worker and killing it.'
    default: 5000

  'hooks-worker-term-retry':
    description: 'How long to wait between attempts to terminate hooks worker.'
    default: 500

  'hooks-worker-handler-host':
    description: 'Host of the hook worker.'
    default: 'localhost'

  'hooks-worker-handler-port':
    description: 'Port of the hook worker.'
    default: 61321

module.exports = options
