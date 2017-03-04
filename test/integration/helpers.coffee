url = require('url')
express = require('express')

logger = require('../../src/logger')


DEFAULT_SERVER_PORT = 9876


runDredd = (dredd, cb) ->
  dredd.configuration.server ?= "http://127.0.0.1:#{DEFAULT_SERVER_PORT}"

  silent = !!logger.transports.console.silent
  logger.transports.console.silent = true # supress Dredd's console output (remove if debugging)

  err = undefined
  stats = undefined
  logging = ''

  recordLogging = (transport, level, message, meta) ->
    logging += "#{level}: #{message}\n"

  logger.on('logging', recordLogging)
  dredd.run((args...) ->
    logger.removeListener('logging', recordLogging)
    logger.transports.console.silent = silent

    [err, stats] = args
    cb(null, {err, stats, logging})
  )


runDreddWithServer = (dredd, app, port, cb) ->
  [cb, port] = [port, DEFAULT_SERVER_PORT] if typeof port is 'function'
  dredd.configuration.server ?= "http://127.0.0.1:#{port}"

  server = app.listen(port, (err) ->
    return cb(err) if err

    runDredd(dredd, (err, results) ->
      server.close( -> cb(err, results))
    )
  )


module.exports = {
  DEFAULT_SERVER_PORT
  runDredd
  runDreddWithServer
}
