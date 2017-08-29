
module.exports = (origin) ->
  segments = []
  segments.push(origin.apiName) if origin.apiName
  segments.push(origin.resourceGroupName) if origin.resourceGroupName
  segments.push(origin.resourceName) if origin.resourceName
  segments.push(origin.actionName) if origin.actionName
  segments.push(origin.exampleName) if origin.exampleName
  segments.join(' > ')
