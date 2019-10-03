import { assert } from 'chai'
import sinon from 'sinon'

import { applyAnswers } from '../../../lib/init'

function createConfig() {
  return { _: [], custom: {} }
}

describe('init._applyAnswers()', () => {
  const ci = {
    appveyor: sinon.spy(),
    circleci: sinon.spy(),
    travisci: sinon.spy(),
    wercker: sinon.spy()
  }

  beforeEach(() => Object.keys(ci).forEach((name) => ci[name].resetHistory()))

  it('applies the API description and the API host as positional CLI arguments', () => {
    const config = applyAnswers(createConfig(), {
      apiDescription: 'apiary.apib',
      apiHost: 'http://127.0.0.1:5000'
    })
    assert.deepEqual(config._, ['apiary.apib', 'http://127.0.0.1:5000'])
  })
  it('sets the server', () => {
    const config = applyAnswers(createConfig(), { server: 'npm start' })
    assert.equal(config.server, 'npm start')
  })
  it('sets the server to null if not provided', () => {
    const config = applyAnswers(createConfig(), {})
    assert.isNull(config.server)
  })
  it('sets the language', () => {
    const config = applyAnswers(createConfig(), { language: 'python' })
    assert.equal(config.language, 'python')
  })
  it('uses default language (nodejs) when none is prompted', () => {
    const config = applyAnswers(createConfig(), { language: undefined })
    assert.equal(config.language, 'nodejs')
  })
  it('sets no reporter by default', () => {
    const config = applyAnswers(createConfig(), {})
    assert.isUndefined(config.reporter)
  })
  it("sets the reporter to 'apiary' if asked", () => {
    const config = applyAnswers(createConfig(), { apiary: true })
    assert.equal(config.reporter, 'apiary')
  })
  it('sets no custom data by default', () => {
    const config = applyAnswers(createConfig(), {})
    assert.deepEqual(config.custom, {})
  })
  it('sets the Apiary API key if provided', () => {
    const config = applyAnswers(createConfig(), { apiaryApiKey: '1234' })
    assert.equal(config.custom.apiaryApiKey, '1234')
  })
  it('sets the Apiary API name if provided', () => {
    const config = applyAnswers(createConfig(), { apiaryApiName: 'myproject' })
    assert.equal(config.custom.apiaryApiName, 'myproject')
  })
  it('creates selected CI configuration if asked', () => {
    applyAnswers(createConfig(), { createCI: 'wercker' }, { ci })
    assert.isTrue(ci.wercker.calledOnce)
    assert.isFalse(
      ci.appveyor.called || ci.circleci.called || ci.travisci.called
    )
  })
  it('updates AppVeyor if asked', () => {
    applyAnswers(createConfig(), { appveyor: true }, { ci })
    assert.isTrue(ci.appveyor.calledOnce)
    assert.isFalse(
      ci.circleci.called || ci.travisci.called || ci.wercker.called
    )
  })
  it('updates CircleCI if asked', () => {
    applyAnswers(createConfig(), { circleci: true }, { ci })
    assert.isTrue(ci.circleci.calledOnce)
    assert.isFalse(
      ci.appveyor.called || ci.travisci.called || ci.wercker.called
    )
  })
  it('updates Travis CI if asked', () => {
    applyAnswers(createConfig(), { travisci: true }, { ci })
    assert.isTrue(ci.travisci.calledOnce)
    assert.isFalse(
      ci.appveyor.called || ci.circleci.called || ci.wercker.called
    )
  })
  it('updates Wercker if asked', () => {
    applyAnswers(createConfig(), { wercker: true }, { ci })
    assert.isTrue(ci.wercker.calledOnce)
    assert.isFalse(
      ci.appveyor.called || ci.circleci.called || ci.travisci.called
    )
  })
  it('updates multiple CIs if asked', () => {
    applyAnswers(createConfig(), { wercker: true, circleci: true }, { ci })
    assert.isTrue(ci.circleci.calledOnce && ci.wercker.calledOnce)
    assert.isFalse(ci.appveyor.called || ci.travisci.called)
  })
})
