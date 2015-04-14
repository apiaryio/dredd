inquirer = require 'inquirer'
fs = require 'fs'
yaml = require 'js-yaml'

interactiveConfig = {}

interactiveConfig.prompt = (config = {}, callback) ->
  questions = []
  questions.push {
    type: "input",
    name: "blueprint",
    message: "Location of the API bleuprint"
    default: config['blueprint'] || "apiary.apib"
   }

  questions.push {
    type: "input"
    name: "server"
    message: "Command to start API backend server"
    default: config['server'] || "rails server"
  }

  questions.push {
    type: "input"
    name: "endpoint"
    message: "URL of tested API endpoint"
    default: config['endpoint'] || "http://localhost:3000"
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
    when: (answers) -> (answers['apiary'] == true && ! config['custom']?['apiaryApiKey']?)
  }

  questions.push {
    type: "input"
    name: "apiaryApiName"
    message: "Please enter Apiary API name"
    default: config['custom']?['apiaryApiName']
    when: (answers) -> (
      (answers['apiary'] == true && ! config['custom']?['apiaryApiName']?) &&
      (answers['apiary'] == true && answers['apiaryApiKey'] != '')
    )
  }

  questions.push {
    type: "confirm"
    name: "travisAdd"
    message: "Found Travis CI configurtation, do you want to add Dredd to the build?"
    default: true
    when: () -> fs.existsSync '.travis.yml'
  }

  questions.push {
    type: "confirm"
    name: "circleAdd"
    message: "Found CircleCI configurtation, do you want to add Dredd to the build?"
    default: true
    when: () -> fs.existsSync 'circle.yml'
  }


  questions.push {
    type: "confirm"
    name: "circleCreate"
    message: "Dredd is best served with Continous Intregration. Create CircleCI config for Dredd?"
    when: (answers) -> (! fs.existsSync('circle.yml') && ! fs.existsSync('.travis.yml'))
  }

  inquirer.prompt questions, callback

interactiveConfig.processAnswers = (config, answers, callback) ->
  config['_'] = [] if not config['_']
  config['_'][0] = answers['blueprint']
  config['_'][1] = answers['endpoint']
  config['server'] = answers['server']

  config['reporter'] = "apiary" if answers['apiary'] == true
  config['custom']['apiaryApiKey'] = answers['apiaryApiKey'] if answers['apiaryApiKey']?
  config['custom']['apiaryApiName'] = answers['apiaryApiName'] if answers['apiaryApiName']?



  interactiveConfig.updateCircle() if answers['circleAdd'] or answers['circleCreate']
  interactiveConfig.updateTravis() if answers['travisAdd'] == true

  callback(config)

interactiveConfig.run = (config, callback) ->
  interactiveConfig.prompt config, (answers) ->
    interactiveConfig.processAnswers config, answers, callback

interactiveConfig.updateCircle = () ->
  file = "circle.yml"

  if fs.existsSync file
    config = yaml.safeLoad fs.readFileSync file
  else
    config = {}

  config['dependencies'] = {} unless config['dependencies']?
  config['dependencies']['pre'] = [] unless config['dependencies']['pre']
  config['dependencies']['pre'].push("npm install -g dredd")if config['dependencies']['pre'].indexOf("npm install -g dredd") == -1

  config['test'] = {} unless config['test']?
  config['test']['pre'] = [] unless config['test']['pre']
  config['test']['pre'].push("dredd") if config['test']['pre'].indexOf("dredd") == -1

  yamlData = yaml.safeDump config
  fs.writeFileSync file, yamlData

interactiveConfig.updateTravis = () ->
  file = ".travis.yml"

  if fs.existsSync file
    config = yaml.safeLoad fs.readFileSync file
  else
    config = {}

  config['before_install'] = [] unless config['before_install']?
  config['before_install'].push("npm install -g dredd") if config['before_install'].indexOf("npm install -g dredd") == -1

  config['before_script'] = [] unless config['before_script']?
  config['before_script'].push("dredd") if config['before_script'].indexOf("dredd") == -1

  yamlData = yaml.safeDump config
  fs.writeFileSync file, yamlData



module.exports = interactiveConfig