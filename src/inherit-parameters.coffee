inheritParameters = (actualParameters, inheritingParameters) ->
  for name, params of inheritingParameters
    if actualParameters[name] == undefined
      actualParameters[name] = params

  return actualParameters

module.exports = inheritParameters
