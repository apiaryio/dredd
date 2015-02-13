# faking setImmediate for node < 0.9
require 'setimmediate'

glob = require 'glob'
fs = require 'fs'
clone = require 'clone'
protagonist = require 'protagonist'
async = require 'async'
request = require 'request'
url = require 'url'

logger = require './logger'
options = require './options'
Runner = require './transaction-runner'
applyConfiguration = require './apply-configuration'
handleRuntimeProblems = require './handle-runtime-problems'
blueprintAstToRuntime = require './blueprint-ast-to-runtime'
configureReporters = require './configure-reporters'

CONNECTION_ERRORS = ['ECONNRESET', 'ENOTFOUND', 'ESOCKETTIMEDOUT', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'EPIPE']

class Dredd
  constructor: (configOrigin) ->
    # do not touch passed configuration, rather work on a clone of it
    # (e.g prevents changing references)
    config = clone configOrigin
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
    configureReporters @configuration, @stats, @tests
    @runner = new Runner @configuration

  run: (callback) ->
    config = @configuration
    stats = @stats

    configDataIsEmpty = true

    config.files ?= []
    config.data ?= {}
    runtimes = {}

    passedConfigData = {}

    for own key, val of config.data or {}
      configDataIsEmpty = false
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

    if not configDataIsEmpty
      config.data = passedConfigData

    # expand all globs
    expandGlobs = (cb) ->
      async.each config.options.path, (globToExpand, globCallback) ->
        if /^http(s)?:\/\//.test globToExpand
          config.files = config.files.concat globToExpand
          return globCallback()
        glob globToExpand, (err, match) ->
          globCallback err if err
          config.files = config.files.concat match
          globCallback()

      , (err) =>
        return callback(err, stats) if err

        if configDataIsEmpty and config.files.length == 0
          return callback({message: "Blueprint file or files not found on path: '#{config.options.path}'"}, stats)

        # remove duplicate filenames
        config.files = config.files.filter (item, pos) ->
          return config.files.indexOf(item) == pos
        cb()


    # load all files
    loadFiles = (cb) ->
      # 6 parallel connections is a standard limit when connecting to one hostname,
      # use the same limit of parallel connections for reading/downloading files
      async.eachLimit config.files, 6, (fileUrlOrPath, loadCallback) ->
        try
          fileUrl = url.parse fileUrlOrPath
        catch
          fileUrl = null

        if fileUrl and fileUrl.protocol in ['http:', 'https:'] and fileUrl.host
          downloadFile fileUrlOrPath, loadCallback
        else
          readLocalFile fileUrlOrPath, loadCallback

      , (err) ->
        return callback(err, stats) if err
        cb()

    downloadFile = (fileUrl, downloadCallback) ->
      request.get
        url: fileUrl
        timeout: 5000
        json: false
      , (downloadError, res, body) ->
        if downloadError
          downloadCallback {message: "Error when loading file from URL '#{fileUrl}'. Is the provided URL correct?"}
        else if not body or res.statusCode < 200 or res.statusCode >= 300
          downloadCallback {message: "Unable to load file from URL '#{fileUrl}'. Server did not send any blueprint back and responded with status code #{res.statusCode}."}
        else
          config.data[fileUrl] = {raw: body, filename: fileUrl}
          downloadCallback()

    readLocalFile = (filePath, readCallback) ->
      fs.readFile filePath, 'utf8', (readingError, data) ->
        return readCallback(readingError) if readingError
        config.data[filePath] = {raw: data, filename: filePath}
        readCallback()

    # parse all file blueprints
    parseBlueprints = (cb) ->
      async.each Object.keys(config.data), (file, parseCallback) ->
        protagonist.parse config.data[file]['raw'], (protagonistError, result) ->
          return parseCallback protagonistError if protagonistError
          config.data[file]['parsed'] = result
          parseCallback()
      , (err) =>
        return callback(err, config.reporter) if err
        # log all parser warnings for each ast
        for file, data of config.data
          result = data['parsed']
          if result['warnings'].length > 0
            for warning in result['warnings']
              message = "Parser warning in file '#{file}':"  + ' (' + warning.code + ') ' + warning.message
              for loc in warning['location']
                pos = loc.index + ':' + loc.length
                message = message + ' ' + pos
              logger.warn message


        runtimes['warnings'] = []
        runtimes['errors'] = []
        runtimes['transactions'] = []

        # extract http transactions for each ast
        for file, data of config.data
          runtime = blueprintAstToRuntime data['parsed']['ast'], file

          runtimes['warnings'] = runtimes['warnings'].concat(runtime['warnings'])
          runtimes['errors'] = runtimes['errors'].concat(runtime['errors'])
          runtimes['transactions'] = runtimes['transactions'].concat(runtime['transactions'])

        runtimeError = handleRuntimeProblems runtimes
        return callback(runtimeError, stats) if runtimeError
        cb()

    #start the runner
    startRunner = () =>
      reporterCount = config.emitter.listeners('start').length
      config.emitter.emit 'start', config.data, () =>
        reporterCount--
        if reporterCount is 0

          # run all transactions
          @runner.config(config)
          @runner.run runtimes['transactions'], () =>
            @transactionsComplete(callback)

    # spin that merry-go-round
    expandGlobs () ->
      loadFiles () ->
        parseBlueprints () ->
          startRunner()



  transactionsComplete: (callback) =>
    stats = @stats
    reporterCount = @configuration.emitter.listeners('end').length
    @configuration.emitter.emit 'end' , () ->
      reporterCount--
      if reporterCount is 0
        callback(null, stats)

module.exports = Dredd
module.exports.options = options
