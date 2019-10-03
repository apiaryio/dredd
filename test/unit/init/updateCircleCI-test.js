import { assert } from 'chai'

import { updateCircleCI } from '../../../lib/init'

function createOptions(contents) {
  return { editYaml: (file, update) => update(contents) }
}

describe('init._updateCircleCI()', () => {
  it('is able to create a new config file', () => {
    const contents = {}
    updateCircleCI(createOptions(contents))

    assert.include(JSON.stringify(contents), 'dredd')
  })

  it("sets a 'dredd' job", () => {
    const contents = {}
    updateCircleCI(createOptions(contents))

    assert.match(contents.jobs.dredd.docker[0].image, /\/node:/)
    assert.equal(contents.jobs.dredd.steps[0], 'checkout')
    assert.match(contents.jobs.dredd.steps[1].run, /npm.+i.+dredd/)
    assert.equal(contents.jobs.dredd.steps[2].run, 'dredd')
  })
})
