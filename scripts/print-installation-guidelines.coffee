
colors = require('colors')

command = colors.bold(colors.yellow('npm install dredd@stable'))
console.error(colors.cyan("""
  ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
  ::                                                                ::
  ::    Install Dredd using #{command} in case you    ::
  ::        prefer stability over new features (e.g. in CI)         ::
  ::                                                                ::
  ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

"""))
