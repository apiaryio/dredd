import { assert } from 'chai'

import { printClosingMessage } from '../../../lib/init'

function print(s) {
  print.output += `${s}\n`
}

describe('init._printClosingMessage()', () => {
  beforeEach(() => {
    print.output = ''
  })

  it('mentions the config has been saved to dredd.yml', () => {
    printClosingMessage({ language: 'nodejs' }, print)
    assert.include(print.output, 'saved to dredd.yml')
  })
  it('does not mention hooks when the language is JavaScript', () => {
    printClosingMessage({ language: 'nodejs' }, print)
    assert.notInclude(print.output, 'hooks')
  })
  it('does mention hooks when the language is not JavaScript', () => {
    printClosingMessage({ language: 'python' }, print)
    assert.include(print.output, 'hooks')
  })
  it('hints how to install non-JavaScript hooks', () => {
    printClosingMessage({ language: 'python' }, print)
    assert.include(print.output, 'pip install dredd_hooks')
  })
})
