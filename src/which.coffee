spawnSync = require 'spawn-sync'

module.exports =
  which: (command) ->
    spawnSync("which", [command]).status == 0