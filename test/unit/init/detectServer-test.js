import { assert } from 'chai'

import { detectServer } from '../../../lib/init'

describe('init._detectServer()', () => {
  it("defaults to 'npm start' script", () => {
    assert.equal(detectServer([]), 'npm start')
  })

  it('assumes Python project means Django application', () => {
    assert.equal(
      detectServer(['README', 'Pipfile']),
      'python manage.py runserver'
    )
  })

  it('assumes Ruby project means RoR application', () => {
    assert.equal(
      detectServer(['README', 'Gemfile']),
      'bundle exec rails server'
    )
  })
})
