path = require('path')
childProcess = require('child_process')


# Docs:
# - https://golang.org/doc/code.html#GOPATH
# - https://golang.org/cmd/go/#hdr-GOPATH_environment_variable
getGoBin = (callback) ->
  goBin = process.env.GOBIN
  if goBin
    process.nextTick( -> callback(null, goBin))
  else
    if process.env.GOPATH
      process.nextTick( ->
        callback(null, path.join(process.env.GOPATH, 'bin'))
      )
    else
      childProcess.exec('go env GOPATH', (err, stdout) ->
        return callback(err) if err
        callback(null, path.join(stdout.trim(), 'bin'))
      )


module.exports = getGoBin
