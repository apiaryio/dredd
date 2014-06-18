inheritParameters = require './inherit-parameters'
expandUriTemplateWithParameters = require './expand-uri-template-with-parameters'
exampleToHttpPayloadPair = require './example-to-http-payload-pair'
convertAstMetadata = require './convert-ast-metadata'

blueprintAstToRuntime = (blueprintAst) ->
  runtime = 
    transactions: []
    errors: []
    warnings: []
  
  origin = {}
  
  for resourceGroup in blueprintAst['resourceGroups']
    origin['resourceGroupName'] = resourceGroup['name']

    for resource in resourceGroup['resources']
      origin['resourceName'] = resource['name']

      for action in resource['actions']
        origin['actionName'] = action['name']

        actionParameters = convertAstMetadata action['parameters']
        resourceParameters = convertAstMetadata resource['parameters']

        parameters = inheritParameters actionParameters, resourceParameters

        uriResult = expandUriTemplateWithParameters resource['uriTemplate'], parameters
        
        for message in uriResult['warnings']
          runtime['warnings'].push {
            origin: JSON.parse(JSON.stringify(origin))
            message: message
          }

        for message in uriResult['errors']
          runtime['errors'].push {
            origin: JSON.parse(JSON.stringify(origin))
            message: message
          }

        
        if uriResult['uri'] != null      
          for example in action['examples']
            origin['exampleName'] = example['name']
            
            result = exampleToHttpPayloadPair example
            
            for message in result['warnings']
              runtime['warnings'].push {
                origin: JSON.parse(JSON.stringify(origin))
                message: message
              }

            # Errors in pair selecting should not happen
            # for message in result['errors']
            #   runtime['errors'].push {
            #     origin: JSON.parse(JSON.stringify(origin))
            #     message: message
            #   }

            transaction = result['pair']
            transaction['origin'] = JSON.parse(JSON.stringify(origin)) 
            transaction['request']['uri'] = uriResult['uri']
            transaction['request']['method'] = action['method']
            
            runtime['transactions'].push transaction

  return runtime

module.exports = blueprintAstToRuntime