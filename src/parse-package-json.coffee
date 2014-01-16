fs = require 'fs'

parsePackageJson = (path) ->
  packagejson = JSON.parse fs.readFileSync(path, "utf8")
  packagejson.name + " v" + packagejson.version

module.exports = parsePackageJson
