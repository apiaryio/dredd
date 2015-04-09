inquirer = require 'inquirer'
fs = require 'fs'

interactiveConfig = {}

interactiveConfig.prompt = (config = {}, callback) ->
  questions = []
  questions.push {
    type: "input",
    name: "blueprint",
    message: "Location of the API bleuprint"
    default: "apiary.apib"
   }

  questions.push {
    type: "input"
    name: "server"
    message: "Command to start API backend server"
    default: "rails server"
  }

  questions.push {
    type: "input"
    name: "endpoint"
    message: "URL of tested API endpoint"
    default: "http://localhost:3000"
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
    when: (answers) -> (answers['apiary'] == true && ! config['cusotom']?['apiaryApiKey']?)
  }

  questions.push {
    type: "input"
    name: "apiaryApiName"
    message: "Please enter Apiary API name"
    default: config['custom']?['apiaryApiName']
    when: (answers) -> (answers['apiary'] == true && ! config['custom']?['apiaryApiName']?)
  }

  questions.push {
    type: "confirm"
    name: "ciAdd"
    message: "Found CI configurtation, do you want to add Dredd to the build?"
    default: true
    when: interactiveConfig.isCiFilePresent
  }

  questions.push {
    type: "rawlist"
    name: "ciCreate"
    message: "Dredd is best served with Continous Intregration. Create CI config for Dredd?"
    choices: [
      'Travis CI'
      'CircleCI'
      'Do not create CI configuration now.'
    ]
    when: (answers) -> ! interactiveConfig.isCiFilePresent()
  }

  inquirer.prompt questions, (answers) ->
    callback(answers)

interactiveConfig.isCiFilePresent = () ->
  files = [
    '.travis.yml'
    'circle.yml'
  ]
  result = false
  for file in files
    result = true if fs.existsSync file

  result

interactiveConfig.processAnswers = (config, answers, callback) ->
  config['_'] = [] if not config['_']
  config['_'][0] = answers['blueprint']
  config['_'][1] = answers['endpoint']
  config['server'] = answers['server']

  config['reporter'] = "apiary" if answers['apiary']?
  config['custom']['apiaryApiKey'] = answers['apiaryApiKey'] if answers['apiaryApiKey']?
  config['custom']['apiaryApiName'] = answers['apiaryApiName'] if answers['apiaryApiName']?

  callback(config)

interactiveConfig.run = (config, callback) ->
  interactiveConfig.prompt config, (answers) ->
    interactiveConfig.processAnswers config, answers, (newConfig) ->
      callback(newConfig)




module.exports = interactiveConfig