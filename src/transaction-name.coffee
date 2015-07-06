module.exports = (transaction) ->
  origin = transaction['origin']

  name = ''
  name += origin['apiName'] if @multiBlueprint
  name += ' > ' if @multiBlueprint
  name += origin['resourceGroupName'] if origin['resourceGroupName'] != ""
  name += ' > ' if  origin['resourceGroupName'] != ""
  name += origin['resourceName'] if origin['resourceName']
  name += ' > ' + origin['actionName'] if origin['actionName']
  name += ' > ' + origin['exampleName'] if origin['exampleName']
  name