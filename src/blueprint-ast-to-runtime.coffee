blueprintAstToRuntime = (blueprintAst) ->
  runtime = 
    transactions: []
    errors: []
    warnings: []
  
  origin = {}

  blueprintAst['resouceGroups'].forEach (resourceGroup) ->
    origin['rescourceGroupName'] = resourceGroup['name']

    resourceGroup['resources'].forEach (resource) ->
      origin['resourceName'] = resource['name']

      resource['actions'].forEach (action) ->
        origin['actionName'] = action['name']

        action['headers'] = inheritHeaders action['headers']
        action['parameters'] = inheritParameters action['parameters'], resource['parameters']

        uriResult = expandUriTemplateWithParamters resource['uriTempalte'], action['parameters']
        
        if uriResult['uri'] != null        
          action['examples'].forEach (example) ->
            origin['exampleName'] = example['name']
            
            payloadPair = exampleToHttpPayloadPair example, action['headers']
            
            payloadPair['request']['uri'] = uriResult['uri']
            
            transaction = payloadPair
            transactions.push {
              origin: origin
              transaction: transaction
            }

  return runtime

