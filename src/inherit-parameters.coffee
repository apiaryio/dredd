inheritParameters = (actualParameters, inheritingParameters) ->
  for name, params of inheritingParameters
    if actualParameters[name] is undefined
      actualParameters[name] = params

  return actualParameters

module.exports = inheritParameters
