# Generates CLI docs for Dredd.
#
# Purpose:
#   Thanks to this we can be sure the CLI docs are always up-to-date.
#
# Usage:
#   The script is a part of the command for building documentation:
#
#       $ npm run docs:build

fs = require('fs')
path = require('path')
ect = require('ect')
clone = require('clone')

options = require('../src/options')


DOCS_DIR = path.join(__dirname, '..', 'docs')
TEMPLATE_DOCUMENT = 'usage-cli.md-template'
OUTPUT_DOCUMENT = 'usage-cli.md'


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


renderer = ect({root: DOCS_DIR})
html = renderer.render(TEMPLATE_DOCUMENT, data)
fs.writeFileSync(path.join(DOCS_DIR, OUTPUT_DOCUMENT), html)
