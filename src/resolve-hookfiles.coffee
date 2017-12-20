fs = require('fs')
glob = require('glob')


# Ensure platform agnostic path.basename function
basename = if process.platform is 'win32' then path.win32.basename else path.basename


# Expand hookfiles - sort files alphabetically and resolve their paths
resolveHookfiles = (hookfiles, cwd = null) ->
  return [] if not hookfiles or not hookfiles.length
  cwd ?= process.cwd()

  resolvedPathsArrays = hookfiles.map((hookfile) ->
    # glob.sync does not resolve paths, only glob patterns
    if glob.hasMagic(hookfile)
      resolvedPaths = glob.sync(hookfile, {cwd}).map((p) -> path.resolve(cwd, p))
    else
      resolvedPath = path.resolve(cwd, hookfile)
      resolvedPaths = if fs.existsSync(resolvedPath) then [resolvedPath] else []

    unless resolvedPaths.length
      throw new Error("Could not find any hook file(s) on path: '#{hookfile}'")

    return resolvedPaths
  )
  resolvedPaths = Array.concat.apply([], resolvedPathsArrays)
  resolvedPaths = resolvedPaths.sort((p1, p2) ->
    [p1, p2] = [basename(p1), basename(p2)]
    switch
      when p1 < p2 then -1
      when p1 > p2 then 1
      else 0
  )
  return resolvedPaths


module.exports = resolveHookfiles
