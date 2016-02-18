inquirer = require 'inquirer'
fs = require 'fs'
yaml = require 'js-yaml'

interactiveConfig = {}

interactiveConfig.prompt = (config = {}, callback) ->
  questions = []
  questions.push {
    type: "input",
    name: "blueprint",
    message: "Location of the API blueprint"
    default: config['blueprint'] || "apiary.apib"
   }

  questions.push {
    type: "input"
    name: "server"
    message: "Command to start API backend server e.g. (bundle exec rails server)"
    default: config['server']
  }

  questions.push {
    type: "input"
    name: "endpoint"
    message: "URL of tested API endpoint"
    default: config['endpoint'] || "http://localhost:3000"
  }

  questions.push {
    type: "list"
    name: "language"
    message: "Programming language of hooks"
    default: "nodejs"
    choices: [
      "ruby"
      "python"
      "nodejs"
      "php"
      "perl"
      "go"
    ]
  }

  questions.push {
    type: "confirm"
    name: "apiary"
    message: "Do you want to use Apiary test inspector?"
    default: true
    when: (answers) -> config['reporter'] != 'apiary'
  }

  questions.push {
    type: "input"
    name: "apiaryApiKey"
    message: "Please enter Apiary API key or leave empty for anonymous reporter"
    default: config['custom']?['apiaryApiKey']
    when: (answers) ->
      # it's not GA on the Apiary side yet
      if process.env['APIARY_BETA']?
        (answers['apiary'] == true && ! config['custom']?['apiaryApiKey']?)
      else
        false
  }

  questions.push {
    type: "input"
    name: "apiaryApiName"
    message: "Please enter Apiary API name"
    default: config['custom']?['apiaryApiName']
    when: (answers) ->
      # it's not GA on the Apiary side yet
      if process.env['APIARY_BETA']?
        (
          (answers['apiary'] == true && ! config['custom']?['apiaryApiName']?) &&
          (answers['apiary'] == true && answers['apiaryApiKey'] != '')
        )
      else
        false
  }

  questions.push {
    type: "confirm"
    name: "travisAdd"
    message: "Found Travis CI configuration, do you want to add Dredd to the build?"
    default: true
    when: () -> fs.existsSync '.travis.yml'
  }

  questions.push {
    type: "confirm"
    name: "circleAdd"
    message: "Found CircleCI configuration, do you want to add Dredd to the build?"
    default: true
    when: () -> fs.existsSync 'circle.yml'
  }


  questions.push {
    type: "confirm"
    name: "circleCreate"
    message: "Dredd is best served with Continuous Integration. Create CircleCI config for Dredd?"
    when: (answers) -> (! fs.existsSync('circle.yml') && ! fs.existsSync('.travis.yml'))
  }

  inquirer.prompt questions, callback

interactiveConfig.processAnswers = (config, answers, callback) ->
  config ?= {}

  config['_'] ?= []
  config['_'][0] = answers['blueprint']
  config['_'][1] = answers['endpoint']
  config['server'] = answers['server'] || null

  config['language'] = answers['language']

  config['reporter'] = "apiary" if answers['apiary'] == true

  config['custom'] ?= {}

  config['custom']['apiaryApiKey']  = answers['apiaryApiKey']  if answers['apiaryApiKey']?
  config['custom']['apiaryApiName'] = answers['apiaryApiName'] if answers['apiaryApiName']?

  interactiveConfig.updateCircle() if answers['circleAdd'] or answers['circleCreate']
  interactiveConfig.updateTravis() if answers['travisAdd'] == true

  callback(config)
  return

interactiveConfig.run = (config, callback) ->
  interactiveConfig.prompt config, (answers) ->
    interactiveConfig.processAnswers config, answers, callback
  return

interactiveConfig.updateCircle = () ->
  file = "circle.yml"

  if fs.existsSync file
    config = yaml.safeLoad fs.readFileSync file
  else
    config = {}

  config['dependencies'] ?= {}
  config['dependencies']['pre'] ?= []
  config['dependencies']['pre'].push("npm install -g dredd")if config['dependencies']['pre'].indexOf("npm install -g dredd") == -1

  config['test'] ?= {}
  config['test']['pre'] ?= []
  config['test']['pre'].push("dredd") if config['test']['pre'].indexOf("dredd") == -1

  yamlData = yaml.safeDump config
  fs.writeFileSync file, yamlData
  return

interactiveConfig.updateTravis = () ->
  file = ".travis.yml"

  if fs.existsSync file
    config = yaml.safeLoad fs.readFileSync file
  else
    config = {}

  config['before_install'] ?= []
  config['before_install'].push("npm install -g dredd") if config['before_install'].indexOf("npm install -g dredd") == -1

  config['before_script'] ?= []
  config['before_script'].push("dredd") if config['before_script'].indexOf("dredd") == -1

  yamlData = yaml.safeDump config
  fs.writeFileSync file, yamlData
  return



module.exports = interactiveConfig
