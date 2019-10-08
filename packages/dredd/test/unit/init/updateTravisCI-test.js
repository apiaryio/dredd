import { assert } from 'chai'

import { updateTravisCI } from '../../../lib/init'

function createOptions(contents) {
  return { editYaml: (file, update) => update(contents) }
}

describe('init._updateTravisCI()', () => {
  it('is able to create a new config file', () => {
    const contents = {}
    updateTravisCI(createOptions(contents))

    assert.include(JSON.stringify(contents), 'dredd')
  })

  it('adds a command to install Dredd', () => {
    const contents = { before_install: ['pipenv install'] }
    updateTravisCI(createOptions(contents))

    assert.equal(contents.before_install[0], 'pipenv install')
    assert.match(contents.before_install[1], /npm.+i.+dredd/)
    assert.equal(contents.before_install.length, 2)
  })

  it('adds a command to run Dredd', () => {
    const contents = { before_script: ['pytest'] }
    updateTravisCI(createOptions(contents))

    assert.deepEqual(contents.before_script, ['pytest', 'dredd'])
  })
})
