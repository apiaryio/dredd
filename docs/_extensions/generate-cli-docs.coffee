# Generates CLI docs for Dredd.
#
# Purpose:
#   Thanks to this we can be sure the CLI docs are always up-to-date.
#
# Usage:
#
#   $ cat document-template.md | coffee generate-cli-docs.coffee > document.md


fs = require('fs')
path = require('path')
ect = require('ect')
clone = require('clone')

options = require('../../src/options')


# Turn options into a sorted array
data = {options: []}

for own name, attributes of options
  option = clone(attributes)
  option.description = option.description.trim()
  option.name = name
  data.options.push(option)

data.options.sort((o1, o2) ->
  switch
    when o1.name < o2.name then -1
    when o1.name > o2.name then 1
    else 0
)


# Process stdin
source = ''
process.stdin.on('data', (buffer) ->
  source += buffer.toString()
)
process.stdin.on('end', ->
  renderer = ect({root: {source}})
  rendered = renderer.render('source', data)
  process.stdout.write(rendered)
)
