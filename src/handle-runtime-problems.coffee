logger = require './logger'

handleRuntimeProblems = (runtime) ->
  if runtime['warnings'].length > 0
    for warning in runtime['warnings']
      message = warning['message']
      origin = warning['origin']

      logger.warn "Runtime compilation warning: " + warning['message'] + "\n on " + \
        origin['resourceGroupName'] + \
        ' > ' + origin['resourceName'] + \
        ' > ' + origin['actionName']

  if runtime['errors'].length > 0
    for error in runtime['errors']
      message = error['message']
      origin = error['origin']

      logger.error "Runtime compilation error: " + error['message'] + "\n on " + \
        origin['resourceGroupName'] + \
        ' > ' + origin['resourceName'] + \
        ' > ' + origin['actionName']

    return new Error("Error parsing ast to blueprint.")

module.exports = handleRuntimeProblems
