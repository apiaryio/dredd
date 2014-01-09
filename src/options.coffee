options =
  reporter:
    alias: "r"
    description: "Output additional report format. This option can be used multiple times to add multiple reporters. Options: junit, nyan, dot, markdown, html"
    default: []

  output:
    alias: "o"
    description: "Specifies output file when using additional file-based reporter. This option can be used multiple times if multiple file-based reporters are used."
    default: []

  header:
    alias: "h"
    description: "Extra header to include in every request. This option can be used multiple times to add multiple headers."
    default: []

  user:
    alias: "u"
    description: "Basic Auth credentials in the form username:password."
    default: null

  "inline-errors":
    alias: "e"
    description: "Determines whether errors are displayed as they occur (true) or agregated and displayed at the end (false)."
    default: false

  method:
    alias: "m"
    description: "Restrict tests to a particular HTTP method (GET, PUT, POST, DELETE, PATCH). This option can be used multiple times to allow multiple methods."
    default: []

  color:
    alias: "c"
    description: "Determines whether console output should include colors."
    default: true

  level:
    alias: "l"
    description: "The level of logging to output. Options: silly, debug, verbose, info, warn, error."
    default: "info"

  timestamp:
    alias: "t"
    description: "Determines whether console output should include timestamps."
    default: false

module.exports = options
