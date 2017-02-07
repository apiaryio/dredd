syncExec = require 'sync-exec'


DREDD_BIN = require.resolve('../../bin/dredd')


isProcessRunning = (processName) ->
  {status} = syncExec "ps axu | grep test/fixtures/scripts/ | grep #{processName} | grep -v grep"
  status == 0


killAll = ->
  syncExec "ps aux | grep test/fixtures/scripts/ | grep -v grep | awk '{print $2}' | xargs kill -9"


module.exports = {
  DREDD_BIN
  isProcessRunning
  killAll
}
