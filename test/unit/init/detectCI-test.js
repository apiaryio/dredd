import { assert } from 'chai'

import { detectCI } from '../../../lib/init'

describe('init._detectCI()', () => {
  it('detects no CI on empty array', () => assert.deepEqual(detectCI([]), []))

  it('detects AppVeyor', () =>
    assert.deepEqual(detectCI(['README', 'appveyor.yml']), ['appveyor']))

  it('detects CircleCI', () =>
    assert.deepEqual(detectCI(['README', '.circleci']), ['circleci']))

  it('detects Travis CI', () =>
    assert.deepEqual(detectCI(['README', '.travis.yml']), ['travisci']))

  it('detects Wercker', () =>
    assert.deepEqual(detectCI(['README', 'wercker.yml']), ['wercker']))

  it('detects multiple CIs', () =>
    assert.deepEqual(detectCI(['README', 'wercker.yml', '.circleci']), [
      'wercker',
      'circleci'
    ]))
})
