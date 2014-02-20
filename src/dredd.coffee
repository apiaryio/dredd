fs = require 'fs'

protagonist = require 'protagonist'

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
    @runner = new Runner(@configuration)

  run: (callback) ->
    config = @configuration
    stats = @stats

    config.emitter.emit 'start'

    fs.readFile config.blueprintPath, 'utf8', (parseError, data) ->
      return callback(parseError, stats) if parseError
      protagonist.parse data, blueprintParsingComplete

    blueprintParsingComplete = (protagonistError, result) =>
      return callback(protagonistError, config.reporter) if protagonistError

      runtime = blueprintAstToRuntime result['ast']
      runtimeError = handleRuntimeProblems runtime
      return callback(runtimeError, stats) if runtimeError

      @runner.run runtime['transactions'], () ->
        reporterCount = config.emitter.listeners('end').length
        config.emitter.emit 'end' , () ->
          reporterCount--
          if reporterCount is 0
            callback(null, stats)

module.exports = Dredd
module.exports.options = options
