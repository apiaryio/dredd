
blueprintUtils = require './blueprint-utils'
logger = require './logger'


handleRuntimeProblems = (blueprintData) ->
  error = false

  for own filename, data of blueprintData
    apiDescriptionDocument = data.raw

    for annotation in data.annotations
      if annotation.type is 'warning'
        log = logger.warn
      else
        error = true
        log = logger.error

      if annotation.component is 'apiDescriptionParser'
        ranges = blueprintUtils.warningLocationToRanges(annotation.location, apiDescriptionDocument)

        message = """\
          Parser #{annotation.type} in file '#{filename}': \
          (#{annotation.type} code #{annotation.code}) #{annotation.message} \
        """
        message += "on #{blueprintUtils.rangesToLinesText(ranges)}" if ranges?.length
        log(message)
      else
        transactionName = [
          annotation.origin.resourceGroupName
          annotation.origin.resourceName
          annotation.origin.actionName
        ].join(' > ')

        log("""\
          Compilation #{annotation.type} in file '#{filename}': \
          #{annotation.message} (#{transactionName}) \
        """)

  return new Error('Error when processing API description.') if error


module.exports = handleRuntimeProblems
