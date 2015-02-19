convertAstMetadata = require './convert-ast-metadata'

# Transforms API Blueprint example to an array of Expected
# HTTP Request and Response body and headers
exampleToHttpPayloadPair = (example) ->

  result =
    warnings: []
    errors: []
    pair: {}

  request = {}
  response = {}

  if example['requests'].length > 1
    text = "Multiple requests, using first."
    result['warnings'].push text

  if example['responses'].length > 1
    text = "Multiple responses, using first."
    result['warnings'].push text

  if example['responses'].length == 0
    text = "No response available. Can't create HTTP transaction."
    result['warnings'].push text
  else
    selectedRequest = example['requests'][0]
    selectedResponse = example['responses'][0]

    if example['requests'].length == 0
      selectedRequest =
        body: ""
        headers: {}

    request['body'] = selectedRequest['body']
    request['headers'] = convertAstMetadata selectedRequest['headers']

    response['body'] = selectedResponse['body']
    response['headers'] = convertAstMetadata selectedResponse['headers']
    response['status'] = selectedResponse['name']
    if selectedResponse['schema'] != ""
      response['schema'] = selectedResponse['schema']

    result['pair']['request'] = request
    result['pair']['response'] = response

  return result

module.exports = exampleToHttpPayloadPair

