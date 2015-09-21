# faking setImmediate for node < 0.9
require 'setimmediate'

glob = require 'glob'
fs = require 'fs'
Drafter = require 'drafter'
async = require 'async'
request = require 'request'
url = require 'url'

logger = require './logger'
options = require './options'
Runner = require './transaction-runner'
applyConfiguration = require './apply-configuration'
handleRuntimeProblems = require './handle-runtime-problems'
blueprintTransactions = require 'blueprint-transactions'
configureReporters = require './configure-reporters'
blueprintUtils = require './blueprint-utils'

CONNECTION_ERRORS = ['ECONNRESET', 'ENOTFOUND', 'ESOCKETTIMEDOUT', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'EPIPE']

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

    @configuration = applyConfiguration(config, @stats)
    @configuration.options ?= {}

    @compiledTransactions = {}

    @runner = new Runner @configuration
    configureReporters @configuration, @stats, @tests, @runner

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
    @expandGlobs (globsErr) =>
      return callback(globsErr, @stats) if globsErr

      @loadFiles (loadErr) =>
        return callback(loadErr, @stats) if loadErr

        @parseBlueprints (parseErr) =>
          return callback(parseErr, @stats) if parseErr

          @compileTransactions (compileErr) =>
            return callback(compileErr, @stats) if compileErr

            @emitStart (emitStartErr) =>
              return callback(emitStartErr, @stats) if emitStartErr

              @startRunner (runnerErr) =>
                return callback(runnerErr, @stats) if runnerErr

                @transactionsComplete(callback)

  # expand all globs
  expandGlobs: (callback) ->
    async.each @configuration.options.path, (globToExpand, globCallback) =>
      if /^http(s)?:\/\//.test globToExpand
        @configuration.files = @configuration.files.concat globToExpand
        return globCallback()
      glob globToExpand, (err, match) =>
        globCallback err if err
        @configuration.files = @configuration.files.concat match
        globCallback()

    , (err) =>
      return callback(err, @stats) if err

      if @configDataIsEmpty and @configuration.files.length == 0
        return callback({message: "Blueprint file or files not found on path: '#{@configuration.options.path}'"}, @stats)

      # remove duplicate filenames
      @configuration.files = removeDuplicates @configuration.files
      callback(null, @stats)

  # load all files
  loadFiles: (callback) ->
    # 6 parallel connections is a standard limit when connecting to one hostname,
    # use the same limit of parallel connections for reading/downloading files
    async.eachLimit @configuration.files, 6, (fileUrlOrPath, loadCallback) =>
      try
        fileUrl = url.parse fileUrlOrPath
      catch
        fileUrl = null

      if fileUrl and fileUrl.protocol in ['http:', 'https:'] and fileUrl.host
        @downloadFile fileUrlOrPath, loadCallback
      else
        @readLocalFile fileUrlOrPath, loadCallback

    , (err) ->
      return callback(err, @stats) if err
      callback()

  downloadFile: (fileUrl, callback) ->
    request.get
      url: fileUrl
      timeout: 5000
      json: false
    , (downloadError, res, body) =>
      if downloadError
        callback {
          message: "Error when loading file from URL '#{fileUrl}'. Is the provided URL correct?"
        }, @stats
      else if not body or res.statusCode < 200 or res.statusCode >= 300
        callback {
          message: """
          Unable to load file from URL '#{fileUrl}'. \
          Server did not send any blueprint back and responded with status code #{res.statusCode}.
          """
        }, @stats
      else
        @configuration.data[fileUrl] = {raw: body, filename: fileUrl}
        callback(null, @stats)

  readLocalFile: (filePath, callback) ->
    fs.readFile filePath, 'utf8', (readingError, data) =>
      return readCallback(readingError) if readingError
      @configuration.data[filePath] = {raw: data, filename: filePath}
      callback(null, @stats)

  # parse all file blueprints
  parseBlueprints: (callback) ->
    async.each Object.keys(@configuration.data), (file, parseCallback) =>
      drafter = new Drafter
      drafter.make @configuration.data[file]['raw'], (drafterError, result) =>
        return parseCallback drafterError if drafterError
        @configuration.data[file]['parsed'] = result
        parseCallback()
    , (err) =>
      return callback(err, @stats) if err
      # log all parser warnings for each ast
      for file, data of @configuration.data
        result = data['parsed']
        if result['warnings'].length > 0
          for warning in result['warnings']
            message = "Parser warning in file '#{file}':"  + ' (' + warning.code + ') ' + warning.message
            ranges = blueprintUtils.warningLocationToRanges warning['location'], data['raw']
            if ranges?.length
              pos = blueprintUtils.rangesToLinesText ranges
              message = message + ' on ' + pos
            logger.warn message

      callback(null, @stats)



  # compile transcations from asts
  compileTransactions: (callback) ->
    @compiledTransactions['warnings'] = []
    @compiledTransactions['errors'] = []
    @compiledTransactions['transactions'] = []

    # extract http transactions for each ast
    for file, data of @configuration.data
      transactions = blueprintTransactions.compile data['parsed']['ast'], file

      @compiledTransactions['warnings'] = @compiledTransactions['warnings'].concat(transactions['warnings'])
      @compiledTransactions['errors'] = @compiledTransactions['errors'].concat(transactions['errors'])
      @compiledTransactions['transactions'] = @compiledTransactions['transactions'].concat(transactions['transactions'])

    runtimeError = handleRuntimeProblems @compiledTransactions
    return callback(runtimeError, @stats) if runtimeError
    callback(null, @stats)

  # start the runner
  emitStart: (callback) ->
    # dredd can have registered more than one reporter
    reporterCount = @configuration.emitter.listeners('start').length

    # atomic state shared between reporters
    reporterErrorOccurred = false

    # when event start is emitted, function in callback is executed for each registered reporter by listeners
    @configuration.emitter.emit 'start', @configuration.data, (reporterError) =>
      reporterCount--

      # if any error in one of reporters occurres, callback is called and other reporters are not executed
      if reporterError and reporterErrorOccurred is false
        reporterErrorOccurred = true
        return callback(reporterError, @stats)

      # # last called reporter callback function starts the runner
      if reporterCount is 0 and reporterErrorOccurred is false
        callback null, @stats

  startRunner: (callback) ->
    # run all transactions
    @runner.config(@configuration)
    @runner.run @compiledTransactions['transactions'], callback

  transactionsComplete: (callback) ->
    reporterCount = @configuration.emitter.listeners('end').length
    @configuration.emitter.emit 'end', =>
      reporterCount--
      if reporterCount is 0
        callback(null, @stats)

module.exports = Dredd
module.exports.options = options
