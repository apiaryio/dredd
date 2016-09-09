{assert} = require 'chai'
{exec} = require 'child_process'
express = require 'express'
clone = require 'clone'


PORT = 3333
DREDD_BIN = require.resolve '../../bin/dredd'


runDredd = (descriptionFile, cb) ->
  result = {}
  cmd = "#{DREDD_BIN} #{descriptionFile} http://localhost:#{PORT} -ed --no-color"

  cli = exec cmd, (err, stdout, stderr) ->
    result.exitStatus = err?.code or null
    result.stdout = '' + stdout
    result.stderr = '' + stderr

  cli.on 'close', (code) ->
    result.exitStatus ?= code if code
    cb null, result


parseJSON = (body) ->
  return undefined unless body
  try
    JSON.parse body
  catch
    body


# This can be removed once https://github.com/apiaryio/dredd/issues/341 is done
parseOutput = (output) ->
  # Parse individual entries (deals also with multi-line entries)
  entries = []
  entry = undefined
  for line in output.split /\r?\n/
    match = line.match /^(\w+): (.+)?$/
    if match
      if entry
        entry.body = entry.body.trim()
        entries.push entry
      entry = {label: match[1], body: match[2] or ''}
    else
      entry.body += "\n#{line.trim()}"

  # Correction of following situation:
  #
  # fail: POST /customers duration: 13ms
  # fail: body: At '/name' Invalid type: null (expected string)
  # body: At '/shoeSize' Invalid type: string (expected number)
  entries = entries.filter (entry, i) ->
    previousEntry = entries[i - 1]
    if entry.label is 'body' and previousEntry.label is 'fail'
      previousEntry.body += '\n' + entry.body
      return false
    return true

  # Re-arrange data from entries
  results = {summary: '', failures: []}
  for entry in entries
    switch entry.label
      when 'complete' then results.summary = entry.body
      when 'fail' then results.failures.push entry.body
  return results


describe 'Regression: Issue #615', ->
  requests = []
  results = undefined

  beforeEach (done) ->
    app = express()

    # Attaching endpoint for each testing scenario
    app.all '/honey', (req, res) ->
      res.status(200).send ''

    # Spinning up the Express server, running Dredd, and saving results
    server = app.listen PORT, ->
      runDredd './test/fixtures/regression-615.apib', (err, result) ->
        results = parseOutput result.stdout
        server.close done

  it 'outputs no failures', ->
    # Intentionally not testing just '.length' as this approach will output the difference
    assert.deepEqual results.failures, []
  it 'results in exactly three tests', ->
    assert.include results.summary, '3 total'
  it 'results in three passing tests', ->
    # Ensures just the 200 responses were selected, because the server returns only 200s
    assert.include results.summary, '3 passing'
