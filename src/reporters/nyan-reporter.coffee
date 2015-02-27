tty = require 'tty'

logger = require './../logger'
prettifyResponse = require './../prettify-response'

class NyanCatReporter
  constructor: (emitter, stats, tests) ->
    @type = "nyan"
    @stats = stats
    @tests = tests
    @isatty = tty.isatty(1) and tty.isatty(2)
    if @isatty
      if process.stdout.getWindowSize
        windowWidth = process.stdout.getWindowSize(1)[0]
      else
        windowWidth = tty.getWindowSize()[1]
    else
      windowWidth = 75
    width = windowWidth * .75 | 0
    @rainbowColors = @generateColors()
    @colorIndex = 0
    @numberOfLines = 4
    @trajectories = [[], [], [], []]
    @nyanCatWidth = 11
    @trajectoryWidthMax = (width - @nyanCatWidth)
    @scoreboardWidth = 5
    @tick = 0
    @errors = []
    @configureEmitter emitter

  configureEmitter: (emitter) =>
    emitter.on 'start', (rawBlueprint, callback) =>
      @cursorHide()
      @draw()
      callback()

    emitter.on 'end', (callback) =>
      @cursorShow()
      i = 0

      while i < @numberOfLines
        @write "\n"
        i++

      if @errors.length > 0
        @write "\n"
        logger.info "Displaying failed tests..."
        for test in @errors
          logger.fail test.title + " duration: #{test.duration}ms"
          logger.fail test.message
          logger.request "\n" + prettifyResponse(test.request) + "\n"
          logger.expected "\n" + prettifyResponse(test.expected) + "\n"
          logger.actual "\n" + prettifyResponse(test.actual) + "\n\n"

      logger.complete "#{@stats.passes} passing, #{@stats.failures} failing, #{@stats.errors} errors, #{@stats.skipped} skipped"
      logger.complete "Tests took #{@stats.duration}ms"
      callback()


    emitter.on 'test pass', (test) =>
      @draw()

    emitter.on 'test skip', (test) =>
      @draw()

    emitter.on 'test fail', (test) =>
      @errors.push test
      @draw()

    emitter.on 'test error', (error, test) =>
      test.message = "\nError: \n"  + error + "\nStacktrace: \n" + error.stack + "\n"
      @errors.push test
      @draw()

  draw: =>
    @appendRainbow()
    @drawScoreboard()
    @drawRainbow()
    @drawNyanCat()
    @tick = not @tick

  drawScoreboard: =>
    write = @write
    draw = (color, n) ->
      write " "
      write "\u001b[" + color + "m" + n + "\u001b[0m"
      write "\n"
    stats = @stats
    colors =
      fail: 31
      skipped: 36
      pass: 32

    draw colors.pass, @stats.passes
    draw colors.fail, @stats.failures
    draw colors.fail, @stats.errors
    draw colors.skipped, @stats.skipped

    @write "\n"
    @cursorUp @numberOfLines + 1

  appendRainbow: =>
    segment = (if @tick then "_" else "-")
    rainbowified = @rainbowify(segment)
    index = 0

    while index < @numberOfLines
      trajectory = @trajectories[index]
      trajectory.shift()  if trajectory.length >= @trajectoryWidthMax
      trajectory.push rainbowified
      index++

  drawRainbow : =>
    scoreboardWidth = @scoreboardWidth
    write = @write
    @trajectories.forEach (line, index) ->
      write "\u001b[" + scoreboardWidth + "C"
      write line.join("")
      write "\n"

    @cursorUp @numberOfLines

  drawNyanCat: =>
    startWidth = @scoreboardWidth + @trajectories[0].length
    color = "\u001b[" + startWidth + "C"
    padding = ""
    @write color
    @write "_,------,"
    @write "\n"
    @write color
    padding = (if @tick then "  " else "   ")
    @write "_|" + padding + "/\\_/\\ "
    @write "\n"
    @write color
    padding = (if @tick then "_" else "__")
    tail = (if @tick then "~" else "^")
    face = undefined
    @write tail + "|" + padding + @face() + " "
    @write "\n"
    @write color
    padding = (if @tick then " " else "  ")
    @write padding + "\"\"  \"\" "
    @write "\n"
    @cursorUp @numberOfLines

  face: =>
    stats = @stats
    if stats.failures
      "( x .x)"
    else if stats.skipped
      "( o .o)"
    else if stats.passes
      "( ^ .^)"
    else
      "( - .-)"

  cursorUp: (n) =>
    @write "\u001b[" + n + "A"

  cursorDown: (n) =>
    @write "\u001b[" + n + "B"

  cursorShow: =>
    @isatty and @write '\u001b[?25h'

  cursorHide: =>
    @isatty and @write '\u001b[?25l'

  generateColors: ->
    colors = []
    i = 0

    while i < (6 * 7)
      pi3 = Math.floor(Math.PI / 3)
      n = (i * (1.0 / 6))
      r = Math.floor(3 * Math.sin(n) + 3)
      g = Math.floor(3 * Math.sin(n + 2 * pi3) + 3)
      b = Math.floor(3 * Math.sin(n + 4 * pi3) + 3)
      colors.push 36 * r + 6 * g + b + 16
      i++
    colors

  rainbowify: (str) =>
    color = @rainbowColors[@colorIndex % @rainbowColors.length]
    @colorIndex += 1
    "\u001b[38;5;" + color + "m" + str + "\u001b[0m"


  write: (str) ->
    process.stdout.write str


module.exports = NyanCatReporter
