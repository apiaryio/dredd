import { assert } from 'chai'

import { updateWercker } from '../../../lib/init'

function createOptions(contents) {
  return { editYaml: (file, update) => update(contents) }
}

describe('init._updateWercker()', () => {
  it('is able to create a new config file', () => {
    const contents = {}
    updateWercker(createOptions(contents))

    assert.include(JSON.stringify(contents), 'dredd')
  })

  it('adds commands to install and run Dredd', () => {
    const contents = {
      build: {
        steps: [{ script: { name: 'pipenv-install', code: 'pipenv install' } }]
      }
    }
    updateWercker(createOptions(contents))

    assert.equal(contents.build.steps.length, 3)
    assert.match(contents.build.steps[0].script.code, /npm.+i.+dredd/)
    assert.equal(contents.build.steps[1].script.code, 'pipenv install')
    assert.equal(contents.build.steps[2].script.code, 'dredd')
  })
})
