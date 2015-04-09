fs = require 'fs'
yaml = require 'js-yaml'

configUtils = {}

configUtils.save = (args, path) ->
  path = './dredd.yml' unless path?

  args['blueprint'] = args['_'][0]
  args['endpoint'] = args['_'][1]

  for key, value of args
    delete args[key] if key.length == 1

  delete args['$0']
  delete args['_']

  yamlArgs = yaml.dump args
  fs.writeFileSync path, yamlArgs


configUtils.load = (path) ->
  path = './dredd.yml' unless path?

  yamlData = fs.readFileSync path
  data = yaml.safeLoad yamlData

  data['_'] = [data['blueprint'], data['endpoint']]

  delete data['blueprint']
  delete data['endpoint']

  data

configUtils.parseCustom = (customArray) ->
  output = {}
  if Array.isArray customArray
    for string in customArray
      splitted = string.split(/:(.+)?/)
      output[splitted[0]] = splitted[1]

  output

module.exports = configUtils