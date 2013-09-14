inheritHeaders = (actualHeaders, inheritingHeaders) -> 
  for name, params of inheritingHeaders
    if actualHeaders[name] == undefined
      actualHeaders[name] = params

  return actualHeaders

module.exports = inheritHeaders