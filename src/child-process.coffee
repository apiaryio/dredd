crossSpawn = require('cross-spawn')


IS_WINDOWS = process.platform is 'win32'
ASCII_CTRL_C = 3

TERM_FIRST_CHECK_TIMEOUT_MS = 1
TERM_DEFAULT_TIMEOUT_MS = 1000
TERM_DEFAULT_RETRY_MS = 300


# Signals the child process to forcefully terminate
signalKill = (childProcess, callback) ->
  childProcess.emit('signalKill')
  if IS_WINDOWS
    taskkill = spawn('taskkill', ['/F', '/T', '/PID', childProcess.pid])
    taskkill.on('exit', (exitStatus) ->
      if exitStatus
        err = new Error("Unable to forcefully terminate process #{childProcess.pid}")
        return callback(err)
      callback()
    )
  else
    childProcess.kill('SIGKILL')
    process.nextTick(callback)


# Signals the child process to gracefully terminate
signalTerm = (childProcess, callback) ->
  childProcess.emit('signalTerm')
  if IS_WINDOWS
    # On Windows, there is no such way as SIGTERM or SIGINT. The closest
    # thing is to interrupt the process with Ctrl+C. Under the hood, that
    # generates '\u0003' character on stdin of the process and if
    # the process listens on stdin, it's able to catch this as 'SIGINT'.
    #
    # However, that only works if user does it manually. There is no
    # way to do it programmatically, at least not in Node.js (and even
    # for C/C++, all the solutions are dirty hacks). Even if you send
    # the very same character to stdin of the process, it's not
    # recognized (the rl.on('SIGINT') event won't get triggered)
    # for some reason.
    #
    # The only thing Dredd is left with is a convention. So when Dredd
    # wants to gracefully signal to the child process it should terminate,
    # it sends the '\u0003' to stdin of the child. It's up to the child
    # to implement reading from stdin in such way it works both for
    # programmatic and manual Ctrl+C.
    childProcess.stdin.write(String.fromCharCode(ASCII_CTRL_C))
  else
    childProcess.kill('SIGTERM')
  process.nextTick(callback)


# Gracefully terminates a child process
#
# Sends a signal to the process as a heads up it should terminate.
# Then checks multiple times whether the process terminated. Retries
# sending the signal. In case it's not able to terminate the process
# within given timeout, it returns an error.
#
# If provided with the 'force' option, instead of returning an error,
# it kills the process unconditionally.
#
# Available options:
# - timeout (number) - Time period in ms for which the termination
#                      attempts will be done
# - retryDelay (number) - Delay in ms between termination attempts
# - force (boolean) - Kills the process forcefully after the timeout
terminate = (childProcess, options = {}, callback) ->
  [callback, options] = [options, {}] if typeof options is 'function'
  force = options.force or false

  # If the timeout is zero or less then the delay for waiting between
  # retries, there will be just one termination attempt
  timeout = if options.timeout? then options.timeout else TERM_DEFAULT_TIMEOUT_MS
  retryDelay = if options.retryDelay? then options.retryDelay else TERM_DEFAULT_RETRY_MS

  terminated = false
  onExit = ->
    terminated = true
    childProcess.removeListener('exit', onExit)
  childProcess.on('exit', onExit)

  start = Date.now()
  t = undefined

  # A function representing one check, whether the process already
  # ended or not. It is repeatedly called until the timeout has passed.
  check = ->
    if terminated
      # Successfully terminated
      clearTimeout(t)
      callback()
    else
      if (Date.now() - start) < timeout
        # Still not terminated, try again
        signalTerm(childProcess, (err) ->
          return callback(err) if err
          t = setTimeout(check, retryDelay)
        )
      else
        # Still not terminated and the timeout has passed, either
        # kill the process (force) or provide an error
        clearTimeout(t)
        if force
          signalKill(childProcess, callback)
        else
          callback(new Error("Unable to gracefully terminate process #{childProcess.pid}"))

  # Fire the first termination attempt and check the result
  signalTerm(childProcess, (err) ->
    return callback(err) if err
    t = setTimeout(check, TERM_FIRST_CHECK_TIMEOUT_MS)
  )


spawn = (args...) ->
  childProcess = crossSpawn.spawn.apply(null, args)

  childProcess.spawned = true
  childProcess.terminated = false
  killedIntentionally = false
  terminatedIntentionally = false

  childProcess.on('signalKill', -> killedIntentionally = true)
  childProcess.on('signalTerm', -> terminatedIntentionally = true)

  childProcess.signalKill = ->
    signalKill(childProcess, (err) ->
      childProcess.emit('error', err) if err
    )

  childProcess.signalTerm = ->
    signalTerm(childProcess, (err) ->
      childProcess.emit('error', err) if err
    )

  childProcess.terminate = (options) ->
    terminate(childProcess, options, (err) ->
      childProcess.emit('error', err) if err
    )

  childProcess.on('error', (err) ->
    if err.syscall and err.syscall.indexOf('spawn') >= 0 then childProcess.spawned = false
  )

  childProcess.on('exit', (exitStatus, signal) ->
    childProcess.terminated = true
    childProcess.killedIntentionally = killedIntentionally
    childProcess.terminatedIntentionally = terminatedIntentionally

    # Crash detection. Emits a 'crash' event in case the process
    # unintentionally terminated with non-zero status code.
    # The 'crash' event's signature:
    #
    # - exitStatus (number, nullable) - The non-zero status code
    # - killed (boolean) - Whether the process was killed or not
    #
    # How to distinguish a process was killed?
    #
    # UNIX:
    # - exitStatus is null or 137 or... https://github.com/apiaryio/dredd/issues/735
    # - signal is 'SIGKILL'
    #
    # Windows:
    # - exitStatus is usually 1
    # - signal isn't set (Windows do not have signals)
    #
    # Yes, you got it - on Windows there's no way to distinguish
    # a process was forcefully killed...
    if not killedIntentionally and not terminatedIntentionally
      if signal is 'SIGKILL'
        childProcess.emit('crash', null, true)
      else if exitStatus isnt 0
        childProcess.emit('crash', exitStatus, false)
  )

  return childProcess


module.exports = {
  signalKill
  signalTerm
  terminate
  spawn
}
