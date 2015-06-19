clone = require 'clone'
inheritParameters = require './inherit-parameters'
expandUriTemplateWithParameters = require './expand-uri-template-with-parameters'
exampleToHttpPayloadPair = require './example-to-http-payload-pair'
convertAstMetadata = require './convert-ast-metadata'
validateParameters = require './validate-parameters'

blueprintAstToRuntime = (blueprintAst, filename) ->
  runtime =
    transactions: []
    errors: []
    warnings: []

  origin = {}
  origin['filename'] = filename

  if blueprintAst['name'] != ""
    origin['apiName'] = blueprintAst['name']
  else
    origin['apiName'] = origin['filename']

  for resourceGroup, index in blueprintAst['resourceGroups']
    #should not be possible specify more than one unnamed group, must verify
    # if resourceGroup['name'] != ""
    #   origin['resourceGroupName'] = resourceGroup['name']
    # else
    #   origin['resourceGroupName'] = "Group #{index + 1}"

    origin['resourceGroupName'] = resourceGroup['name']

    for resource in resourceGroup['resources']
      if resource['name'] != ""
        origin['resourceName'] = resource['name']
      else
        origin['resourceName'] = resource['uriTemplate']

      # Get rid with polluting of origin with not related data!
      origin['uriTemplate'] = "#{resource['uriTemplate']}"

      for action in resource['actions']
        if action['name'] != ""
          origin['actionName'] = action['name']
        else
          origin['actionName'] = action['method']

        actionParameters = convertAstMetadata action['parameters']
        resourceParameters = convertAstMetadata resource['parameters']

        parameters = inheritParameters actionParameters, resourceParameters

        # validate URI parameters
        paramsResult = validateParameters parameters

        for message in paramsResult['errors']
          runtime['errors'].push {
            origin: clone origin
            message: message
          }

        # expand URI parameters
        if action.attributes?.uriTemplate
          uri = action.attributes.uriTemplate
        else
          uri = resource['uriTemplate']

        uriResult = expandUriTemplateWithParameters uri, parameters

        for message in uriResult['warnings']
          runtime['warnings'].push {
            origin: clone origin
            message: message
          }

        for message in uriResult['errors']
          runtime['errors'].push {
            origin: clone origin
            message: message
          }


        if uriResult['uri'] != null
          for example, exampleIndex in action['examples']
            if action['examples'].length > 1 and example['name'] == ""
              origin['exampleName'] = "Example " + (exampleIndex + 1)
            else
              origin['exampleName'] = example['name']

            result = exampleToHttpPayloadPair example

            for message in result['warnings']
              runtime['warnings'].push {
                origin: clone origin
                message: message
              }

            # Errors in pair selecting should not happen
            # for message in result['errors']
            #   runtime['errors'].push {
            #     origin: JSON.parse(JSON.stringify(origin))
            #     message: message
            #   }

            transaction = result['pair']
            transaction['origin'] = clone origin
            transaction['request']['uri'] = uriResult['uri']
            transaction['request']['method'] = action['method']

            runtime['transactions'].push transaction

  return runtime

module.exports = blueprintAstToRuntime
