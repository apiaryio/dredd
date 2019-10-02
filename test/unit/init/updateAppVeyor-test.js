import { assert } from 'chai'

import { updateAppVeyor } from '../../../lib/init'

function createOptions(contents) {
  return { editYaml: (file, update) => update(contents) }
}

describe('init._updateAppVeyor()', () => {
  it('is able to create a new config file', () => {
    const contents = {}
    updateAppVeyor(createOptions(contents))

    assert.include(JSON.stringify(contents), 'dredd')
  })

  it('adds commands to install Dredd', () => {
    const contents = { install: ['pipenv install'] }
    updateAppVeyor(createOptions(contents))

    assert.equal(contents.install.length, 4)
    assert.match(contents.install[3], /npm.+i.+dredd/)
  })

  it('adds a command to run Dredd', () => {
    const contents = { test_script: ['pytest'] }
    updateAppVeyor(createOptions(contents))

    assert.deepEqual(contents.test_script, ['pytest', 'dredd'])
  })
})
