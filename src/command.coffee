path = require 'path'
optimist = require 'optimist'
console = require 'console'

parsePackageJson = require './parse-package-json'
Dredd = require './dredd'

version = parsePackageJson path.join(__dirname, '../package.json')

class DreddCommand
  constructor: (options = {}, @cb) ->
    # support to call both 'new DreddCommand()' and/or 'DreddCommand()'
    # without the "new" keyword
    if not (@ instanceof DreddCommand)
      return new DreddCommand(options, @cb)

    {@exit, @custom} = options

    @custom ?= {}

    if not @custom.cwd or typeof @custom.cwd isnt 'string'
      @custom.cwd = process.cwd()

    if not @custom.argv or not Array.isArray @custom.argv
      @custom.argv = []

    @finished = false

  warmUp: ->
    @finished = false

    @optimist = optimist(@custom['argv'], @custom['cwd'])

    @optimist.usage(
      """
      Usage:
        dredd <path or URL to blueprint> <api_endpoint> [OPTIONS]

      Example:
        dredd ./apiary.md http://localhost:3000 --dry-run
      """
    )
    .options(Dredd.options)
    .wrap(80)

    @argv = @optimist.argv

    argError = false

    if not @cb
      @exit and (@exit is process.exit) and @sigIntEventAdd = true
      @_processExit = @exit or process.exit
    else
      @_processExit = ((code) ->
        if @finished then return
        @finished = true
        if @sigIntEventAdded
          process.removeEventListener 'SIGINT', @commandSigInt
        @cb code
        return @
      ).bind @

    if @argv.help is true
      @optimist.showHelp(console.error)
      return @_processExit(0)

    if @argv.version is true
      console.log version
      return @_processExit(0)

    if not @argv._[0]?
      console.error("\nError: Must specify path to blueprint file.")
      argError = true

    if not @argv._[1]?
      console.error("\nError: Must specify api endpoint.")
      argError = true

    if argError
      console.error("\n")
      @optimist.showHelp(console.error)
      return @_processExit(1)

    # transform path and p argument to array if it's not
    if !Array.isArray(@argv['path'])
      @argv['path'] = @argv['p'] = [@argv['path']]

    configurationForDredd = @initConfig()
    @dreddInstance = @initDredd configurationForDredd
    return @

  lastArgvIsApiEndpoint: ->
    # some shells are automatically expanding globs and concating result as arguments
    # so I'm taking last argument as API endpoint server URL and removing it forom optimist's args
    @server = @argv._[@argv._.length - 1]
    @argv._.splice(@argv._.length - 1, 1)
    return @

  takeRestOfParamsAsPath: ->
    # and rest of arguments concating to 'path' and 'p' opts, duplicates are filtered out later
    @argv['p'] = @argv['path'] = @argv['path'].concat(@argv._)
    return @

  initConfig: ->
    @
    .lastArgvIsApiEndpoint()
    .takeRestOfParamsAsPath()

    configuration =
      'server': @server
      'options': @argv

    # push first argument (without some known configuration --key) into paths
    configuration.options.path ?= []
    configuration.options.path.push @argv._[0]

    configuration.custom = @custom

    return configuration

  initDredd: (configuration) ->
    dredd = new Dredd configuration
    return dredd

  commandSigInt: ->
    console.log "\nShutting down from SIGINT (Ctrl-C)"
    @dreddInstance.transactionsComplete => @_processExit(0)

  takeoff: ->
    if @finished then return

    @runDredd @dreddInstance

  runDredd: (dreddInstance) ->
    if @sigIntEventAdd
      # handle SIGINT from user
      @sigIntEventAdded = !@sigIntEventAdd = false
      process.on 'SIGINT', @commandSigInt

    dreddInstance.run (error, stats) =>
      if error
        if error.message
          console.error error.message
        if error.stack
          console.error error.stack
        return @_processExit(1)
      if (stats.failures + stats.errors) > 0
        @_processExit(1)
      else
        @_processExit(0)
      return

    return @

exports = module.exports = DreddCommand
