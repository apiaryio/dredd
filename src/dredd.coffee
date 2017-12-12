glob = require 'glob'
fs = require 'fs'
clone = require 'clone'
async = require 'async'
request = require 'request'
url = require 'url'

logger = require('./logger')
options = require './options'
Runner = require './transaction-runner'
{applyConfiguration} = require './configuration'
handleRuntimeProblems = require './handle-runtime-problems'
dreddTransactions = require 'dredd-transactions'
configureReporters = require './configure-reporters'


PROXY_ENV_VARIABLES = ['HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY']
FILE_DOWNLOAD_TIMEOUT = 5000


removeDuplicates = (arr) ->
  arr.reduce (alreadyProcessed, currentItem) ->
    if alreadyProcessed.indexOf(currentItem) is -1
      return alreadyProcessed.concat currentItem
    return alreadyProcessed
  , []

class Dredd
  constructor: (config) ->
    @init(config)

  # this is here only because there there is no way how to spy a constructor in CoffeScript
  init: (config) ->
    @configuration = applyConfiguration(config)
    @configuration.http = {}

    @tests = []
    @stats =
      tests: 0
      failures: 0
      errors: 0
      passes: 0
      skipped: 0
      start: 0
      end: 0
      duration: 0
    @transactions = []
    @runner = new Runner(@configuration)
    configureReporters(@configuration, @stats, @tests, @runner)
    @logProxySettings()

  logProxySettings: ->
    proxySettings = []
    for own envVariableName, envVariableValue of process.env
      continue unless envVariableName.toUpperCase() in PROXY_ENV_VARIABLES
      continue unless envVariableValue isnt ''
      proxySettings.push("#{envVariableName}=#{envVariableValue}")

    if proxySettings.length
      message = """\
        HTTP(S) proxy specified by environment variables: \
        #{proxySettings.join(', ')}. Please read documentation on how \
        Dredd works with proxies: \
        https://dredd.readthedocs.io/en/latest/how-it-works/#using-https-proxy\
      """
      logger.verbose(message)

  run: (callback) ->
    @configDataIsEmpty = true

    @configuration.files ?= []
    @configuration.data ?= {}

    passedConfigData = {}

    for own key, val of @configuration.data or {}
      @configDataIsEmpty = false
      if (typeof val is 'string')
        passedConfigData[key] = {
          filename: key
          raw: val
        }
      else if (typeof val is 'object') and val.raw and val.filename
        passedConfigData[val.filename] = {
          filename: val.filename
          raw: val.raw
        }

    if not @configDataIsEmpty
      @configuration.data = passedConfigData

    # remove duplicate paths
    @configuration.options.path = removeDuplicates @configuration.options.path

    # spin that merry-go-round
    logger.verbose('Expanding glob patterns.')
    @expandGlobs (globsErr) =>
      return callback(globsErr, @stats) if globsErr

      logger.verbose('Reading API description files.')
      @loadFiles (loadErr) =>
        return callback(loadErr, @stats) if loadErr

        logger.verbose('Parsing API description files and compiling a list of HTTP transactions to test.')
        @compileTransactions (compileErr) =>
          return callback(compileErr, @stats) if compileErr

          logger.verbose('Starting reporters and waiting until all of them are ready.')
          @emitStart (emitStartErr) =>
            return callback(emitStartErr, @stats) if emitStartErr

            logger.verbose('Starting transaction runner.')
            @startRunner (runnerErr) =>
              return callback(runnerErr, @stats) if runnerErr

              logger.verbose('Wrapping up testing.')
              @transactionsComplete(callback)

  # expand all globs
  expandGlobs: (callback) ->
    async.each @configuration.options.path, (globToExpand, globCallback) =>
      if /^http(s)?:\/\//.test globToExpand
        @configuration.files = @configuration.files.concat globToExpand
        return globCallback()

      glob globToExpand, (err, match) =>
        return globCallback(err) if err
        @configuration.files = @configuration.files.concat match
        globCallback()

    , (err) =>
      return callback(err, @stats) if err

      if @configDataIsEmpty and @configuration.files.length == 0
        err = new Error("""\
          API description document (or documents) not found on path: \
          '#{@configuration.options.path}'\
        """)
        return callback(err, @stats)

      # remove duplicate filenames
      @configuration.files = removeDuplicates @configuration.files
      callback(null, @stats)

  # load all files
  loadFiles: (callback) ->
    # 6 parallel connections is a standard limit when connecting to one hostname,
    # use the same limit of parallel connections for reading/downloading files
    async.eachLimit @configuration.files, 6, (fileUrlOrPath, loadCallback) =>
      {protocol, host} = url.parse(fileUrlOrPath)
      if host and protocol in ['http:', 'https:']
        logger.verbose('Downloading remote file:', fileUrlOrPath)
        @downloadFile(fileUrlOrPath, loadCallback)
      else
        @readLocalFile(fileUrlOrPath, loadCallback)
    , callback

  downloadFile: (fileUrl, callback) ->
    options = clone(@configuration.http)
    options.url = fileUrl
    options.timeout = FILE_DOWNLOAD_TIMEOUT

    request.get(options, (downloadError, res, body) =>
      if downloadError
        logger.debug("Downloading #{fileUrl} errored:", "#{downloadError}" or downloadError.code)
        err = new Error("""\
          Error when loading file from URL '#{fileUrl}'. \
          Is the provided URL correct?\
        """)
        return callback err, @stats
      if not body or res.statusCode < 200 or res.statusCode >= 300
        err = new Error("""
          Unable to load file from URL '#{fileUrl}'. \
          Server did not send any blueprint back and responded with status code #{res.statusCode}.\
        """)
        return callback err, @stats
      @configuration.data[fileUrl] = {raw: body, filename: fileUrl}
      callback(null, @stats)
    )

  readLocalFile: (filePath, callback) ->
    fs.readFile filePath, 'utf8', (readError, data) =>
      if readError
        err = new Error("""\
          Error when reading file '#{filePath}' (#{readError.message}). \
          Is the provided path correct?\
        """)
        return callback(err)
      @configuration.data[filePath] = {raw: data, filename: filePath}
      callback(null, @stats)

  # compile transcations from asts
  compileTransactions: (callback) ->
    @transactions = []

    # compile HTTP transactions for each API description
    async.each(Object.keys(@configuration.data), (filename, next) =>
      fileData = @configuration.data[filename]
      fileData.annotations ?= []

      logger.verbose('Compiling HTTP transactions from API description file:', filename)
      dreddTransactions.compile(fileData.raw, filename, (compilationError, compilationResult) =>
        return next(compilationError) if compilationError

        fileData.mediaType = compilationResult.mediaType
        fileData.annotations = fileData.annotations.concat(compilationResult.annotations)
        @transactions = @transactions.concat(compilationResult.transactions)
        next()
      )
    , (runtimeError) =>
      runtimeError ?= handleRuntimeProblems(@configuration.data)
      callback(runtimeError, @stats)
    )

  # start the runner
  emitStart: (callback) ->
    # more than one reporter is supported
    reporterCount = @configuration.emitter.listeners('start').length

    # when event 'start' is emitted, function in callback is executed for each
    # reporter registered by listeners
    @configuration.emitter.emit('start', @configuration.data, (reporterError) =>
      logger.error(reporterError.message) if reporterError

      # last called reporter callback function starts the runner
      reporterCount--
      if reporterCount is 0
        callback(null, @stats)
    )

  startRunner: (callback) ->
    # run all transactions
    @runner.config(@configuration)
    @runner.run @transactions, callback

  transactionsComplete: (callback) ->
    reporterCount = @configuration.emitter.listeners('end').length
    @configuration.emitter.emit 'end', =>
      reporterCount--
      if reporterCount is 0
        callback(null, @stats)

module.exports = Dredd
module.exports.options = options
