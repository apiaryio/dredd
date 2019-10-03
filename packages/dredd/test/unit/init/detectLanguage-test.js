import { assert } from 'chai'

import { detectLanguage } from '../../../lib/init'

describe('init._detectLanguage()', () => {
  it('defaults to JavaScript', () => assert.equal(detectLanguage([]), 'nodejs'))
  ;[
    { name: 'Rust', value: 'rust', file: 'Cargo.toml' },
    { name: 'Go', value: 'go', file: 'foo.go' },
    { name: 'PHP', value: 'php', file: 'composer.json' }
  ].forEach(({ name, value, file }) => {
    it(`prioritizes ${name} over Python`, () =>
      assert.equal(detectLanguage(['README', 'Pipfile', file]), value))
    it(`prioritizes ${name} over Ruby`, () =>
      assert.equal(detectLanguage(['README', 'Gemfile', file]), value))
  })

  it('detects Python', () =>
    assert.equal(detectLanguage(['README', 'Pipfile']), 'python'))
  it('detects Ruby', () =>
    assert.equal(detectLanguage(['README', 'Gemfile']), 'ruby'))
})
