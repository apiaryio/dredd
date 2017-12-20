fs = require('fs')
glob = require('glob')


# Ensure platform agnostic path.basename function
basename = if process.platform is 'win32' then path.win32.basename else path.basename


# Expand hookfiles - sort files alphabetically and resolve their paths
resolveHookfiles = (hookfiles, cwd = null) ->
  cwd ?= process.cwd()

  return hookfiles.reduce((result, unresolvedPath) ->
    # glob.sync does not resolve paths, only glob patterns

    unresolvedPaths = if glob.hasMagic(unresolvedPath) then glob.sync(unresolvedPath) else
      if fs.existsSync(unresolvedPath) then [unresolvedPath] else []

    if unresolvedPaths.length == 0
      throw new Error("Hook file(s) not found on path: #{unresolvedPath}")

    # Gradually append sorted and resolved paths
    result.concat unresolvedPaths
      # Create a filename / filepath map for easier sorting
      # Example:
      # [
      #   { basename: 'filename1.coffee', path: './path/to/filename1.coffee' }
      #   { basename: 'filename2.coffee', path: './path/to/filename2.coffee' }
      # ]
      .map((filepath) -> basename: basename(filepath), path: filepath)
      # Sort 'em up
      .sort((a, b) -> switch
        when a.basename < b.basename then -1
        when a.basename > b.basename then 1
        else 0
      )
      # Resolve paths to absolute form. Take into account current working dir
      .map((item) -> path.resolve(cwd, item.path))
  , [] # Start with empty result
  )


module.exports = resolveHookfiles
