module.exports = (transaction) ->
  origin = transaction['origin']

  name = ''
  name += origin['apiName']
  name += ' > '
  name += origin['resourceGroupName'] if origin['resourceGroupName'] isnt ''
  name += ' > ' if  origin['resourceGroupName'] isnt ''
  name += origin['resourceName'] if origin['resourceName']
  name += ' > ' + origin['actionName'] if origin['actionName']
  name += ' > ' + origin['exampleName'] if origin['exampleName']
  name