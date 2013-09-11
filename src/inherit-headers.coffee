inheritHeaders = (actualHeaders, inheritingHeaders) -> 
  for name, value of inheritingHeaders
    if actualHeaders[name] == undefined
      actualHeaders[name] = value

  return actualHeaders

module.exports = inheritHeaders