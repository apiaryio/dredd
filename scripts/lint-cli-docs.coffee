# Ensures the CLI docs are up to date.


fs = require 'fs'
{assert} = require 'chai'
execSync = require 'sync-exec'


usageDocs = fs.readFileSync 'docs/usage.md', 'utf-8'

helpOutput = execSync('bin/dredd --help')?.stderr?.trim?() or ''
helpOutput = (line.trimRight() for line in helpOutput.split(/\n/)).join('\n') # without trailing whitespace
helpOutput = """```\n#{helpOutput}\n```""" # turning to Markdown code block


try
  assert.include usageDocs, helpOutput
catch e
  console.error 'Documentation of CLI in docs/usage.md is not up to date.'
  process.exit 1
