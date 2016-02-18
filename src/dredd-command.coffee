path = require 'path'
optimist = require 'optimist'
console = require 'console'
fs = require 'fs'
{exec} = require('child_process')

parsePackageJson = require './parse-package-json'
Dredd = require './dredd'
interactiveConfig = require './interactive-config'
configUtils = require './config-utils'

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

  setOptimistArgv: ->
    @optimist = optimist(@custom['argv'], @custom['cwd'])
    @cliArgv = @optimist.argv

    @optimist.usage(
      """
      Usage:
        $ dredd init

      Or:
        $ dredd <path or URL to blueprint> <api_endpoint> [OPTIONS]

      Example:
        $ dredd ./apiary.md http://localhost:3000 --dry-run
      """
    )
    .options(Dredd.options)
    .wrap(80)

    @argv = @optimist.argv

  setExitOrCallback: ->
    if not @cb
      if @exit and (@exit is process.exit)
        @sigIntEventAdd = true

      if @exit
        @_processExit = ((code) ->
          @finished = true
          @serverProcess.kill('SIGKILL') if @serverProcess?
          @exit(code)
        ).bind @
      else
        @_processExit = ((code) ->
          @serverProcess.kill('SIGKILL') if @serverProcess?
          process.exit code
        ).bind @

    else
      @_processExit = ((code) ->

        @finished = true
        if @sigIntEventAdded
          process.removeEventListener 'SIGINT', @commandSigInt
        @cb code
        return @
      ).bind @

  moveBlueprintArgToPath: () ->
    # transform path and p argument to array if it's not
    if !Array.isArray(@argv['path'])
      @argv['path'] = @argv['p'] = [@argv['path']]

  checkRequiredArgs: () ->
    argError = false

    # if blueprint is missing
    if not @argv._[0]?
      console.error("\nError: Must specify path to blueprint file.")
      argError = true

    # if endpoint is missing
    if not @argv._[1]?
      console.error("\nError: Must specify api endpoint.")
      argError = true

    # show help if argument is missing
    if argError
      console.error("\n")
      @optimist.showHelp(console.error)
      return @_processExit(1)


  runExitingActions: () ->
    # run interactive config
    if @argv["_"][0] == "init" or @argv.init == true
      @finished = true
      interactiveConfig.run @argv, (config) =>
        configUtils.save(config)
        console.log ""
        console.log "Configuration saved to dredd.yml"
        console.log ""
        if config['language'] == "nodejs"
          console.log "Run test now, with:"
        else
          console.log "Install hooks handler and run Dredd test with:"
        console.log ""
        if config['language'] == 'ruby'
          console.log "  $ gem install dredd_hooks"
        else if config['language'] == 'python'
          console.log "  $ pip install dredd_hooks"
        else if config['language'] == 'php'
          console.log "  $ composer require ddelnano/dredd-hooks-php --dev"
        else if config['language'] == 'perl'
          console.log "  $ cpanm Dredd::Hooks"
        else if config['language'] == 'go'
          console.log "  $ go get github.com/snikch/goodman"

        console.log "  $ dredd"
        console.log ""

        return @_processExit(0)

    # show help
    else if @argv.help is true
      @optimist.showHelp(console.error)
      return @_processExit(0)

    # show version
    else if @argv.version is true
      console.log version
      return @_processExit(0)

  loadDreddFile: () ->
    if fs.existsSync './dredd.yml'
      console.log 'Configuration dredd.yml found, ignoring other arguments.'
      @argv = configUtils.load()

    # overwrite saved config with cli arguments
    for key, value of @cliArgv
      if key != "_" and key != "$0"
        @argv[key] = value


  parseCustomConfig: () ->
    @argv.custom = configUtils.parseCustom @argv.custom

  runServerAndThenDredd: (callback) ->
    if not @argv['server']?
      @runDredd @dreddInstance
    else
      @serverProcess = exec @argv['server']
      console.log "Starting server with command: #{@argv['server']}"

      @serverProcess.stdout.setEncoding 'utf8'

      @serverProcess.stdout.on 'data', (data) ->
        process.stdout.write data.toString()

      @serverProcess.stderr.setEncoding 'utf8'

      @serverProcess.stderr.on 'data', (data) ->
        process.stdout.write data.toString()

      @serverProcess.on 'error', (error) =>
        console.log error
        console.log "Server command failed, exitting..."
        @_processExit(2)

      # Ensure server is not running when dredd exits prematurely somewhere
      process.on 'beforeExit', () =>
        @serverProcess.kill('SIGKILL') if @serverProcess?

      # Ensure server is not running when dredd exits prematurely somewhere
      process.on 'exit', () =>
        @serverProcess.kill('SIGKILL') if @serverProcess?

      waitSecs = parseInt(@argv['server-wait'], 10)
      waitMilis = waitSecs * 1000
      console.log "Waiting #{waitSecs} seconds for server command to start..."

      @wait = setTimeout =>
        @runDredd @dreddInstance
      , waitMilis

  run: ->
    for task in [
      @setOptimistArgv
      @setExitOrCallback
      @parseCustomConfig
      @runExitingActions
      @loadDreddFile
      @checkRequiredArgs
      @moveBlueprintArgToPath
    ]
      task.call @
      return if @finished

    configurationForDredd = @initConfig()
    @dreddInstance = @initDredd configurationForDredd

    try
      @runServerAndThenDredd()
    catch e
      console.log e.message
      console.log e.stack
      @_processExit(2)
    return



  lastArgvIsApiEndpoint: ->
    # when blueprint path is a glob, some shells are automatically expanding globs and concating
    # result as arguments so I'm taking last argument as API endpoint server URL and removing it
    #  forom optimist's args
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
