# faking setImmediate for node < 0.9
require 'setimmediate'

glob = require 'glob'
fs = require 'fs'
protagonist = require 'protagonist'
async = require 'async'

logger = require './logger'
options = require './options'
Runner = require './transaction-runner'
applyConfiguration = require './apply-configuration'
handleRuntimeProblems = require './handle-runtime-problems'
blueprintAstToRuntime = require './blueprint-ast-to-runtime'
configureReporters = require './configure-reporters'

class Dredd
  constructor: (config) ->
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

    config.files = []

    # expand all globs
    async.each config.options.path, (globToExpand, globCallback) ->
      glob globToExpand, (err, match) ->
        globCallback err if err
        config.files = config.files.concat match
        globCallback()

    , (err) =>
      return callback(err, stats) if err
      return callback({message: "Blueprint file or files not found on path: '#{config.options.path}'"}, stats) if config.files.length == 0

      # remove duplicate filenames
      config.files = config.files.filter (item, pos) ->
        return config.files.indexOf(item) == pos

      config.data = {}

      # load all files
      async.each config.files, (file, loadCallback) ->
        fs.readFile file, 'utf8', (loadingError, data) ->
          return loadCallback(loadingError) if loadingError
          config.data[file] = {raw: data, file: file}
          loadCallback()

      , (err) =>
        return callback(err, stats) if err

        # parse all file blueprints
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

          runtimes = {}
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

          reporterCount = config.emitter.listeners('start').length
          config.emitter.emit 'start', config.data, () =>
            reporterCount--
            if reporterCount is 0

              # run all transactions
              @runner.config(config)
              @runner.run runtimes['transactions'], () =>
                @transactionsComplete(callback)

  transactionsComplete: (callback) =>
    stats = @stats
    reporterCount = @configuration.emitter.listeners('end').length
    @configuration.emitter.emit 'end' , () ->
      reporterCount--
      if reporterCount is 0
        callback(null, stats)

module.exports = Dredd
module.exports.options = options
