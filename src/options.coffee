options =
  reporter:
    alias: "r"
    description: "Output additional report format. This option can be used multiple times to add multiple reporters. Options: junit, nyan, dot, markdown, html.\n"
    default: []

  output:
    alias: "o"
    description: "Specifies output file when using additional file-based reporter. This option can be used multiple times if multiple file-based reporters are used.\n"
    default: []

  header:
    alias: "h"
    description: "Extra header to include in every request. This option can be used multiple times to add multiple headers.\n"
    default: []

  sorted:
    alias: "s"
    description: "Sorts requests in a sensible way so that objects are not modified before they are created. Order: CONNECT, OPTIONS, POST, GET, HEAD, PUT, PATCH, DELETE, TRACE.\n"
    default: false

  user:
    alias: "u"
    description: "Basic Auth credentials in the form username:password.\n"
    default: null

  "inline-errors":
    alias: "e"
    description: "Determines whether failures and errors are displayed as they occur (true) or agregated and displayed at the end (false).\n"
    default: false

  details:
    alias: "d"
    description: "Determines whether request/response details are included in passing tests.\n"
    default: false

  method:
    alias: "m"
    description: "Restrict tests to a particular HTTP method (GET, PUT, POST, DELETE, PATCH). This option can be used multiple times to allow multiple methods.\n"
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

  help:
    description: "Show usage information.\n"

  version:
    description: "Show version number.\n"

module.exports = options
