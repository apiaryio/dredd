{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require 'proxyquire'
inquirerStub = require 'inquirer'
fsStub = require 'fs'

interactiveConfig = proxyquire '../../src/interactive-config', {
  'inquirer': inquirerStub
  'fs': fsStub
}

describe 'interactiveConfig', () ->
  it 'exports a object', () ->
    assert.isObject interactiveConfig


  describe '.prompt(config, callback)', () ->
    it 'is a defined function', () ->
      assert.isFunction interactiveConfig.prompt

    describe 'when I call it ', () ->

      it 'should run inquirer', (done) ->
        sinon.stub inquirerStub, 'prompt', (quesetions, cb) -> cb()

        interactiveConfig.prompt {}, () ->
          assert.isTrue inquirerStub.prompt.called
          done()

  describe '.processAnswers(config, answers, callback)', () ->
    answers = {}
    config = {}

    describe 'when no apiary config passed', () ->
      before () ->
        answers =
          blueprint: 'apiary.apib'
          server: 'rails server'
          endpoint: 'http://localhost:3000'
          apiary: true
          apiaryApiKey: 'key'
          apiaryApiName: 'name'
          ciAdd: true

        config =
          '_': []
          custom: {}

      describe 'config object passed to callback', () ->
        object = {}

        before (done) ->
          interactiveConfig.processAnswers config, answers, (config) ->
            object = config
            done()

        it 'should have properties set from the config on proper places', () ->
          assert.equal object['_'][0], 'apiary.apib'
          assert.equal object['_'][1], 'http://localhost:3000'
          assert.equal object['server'], 'rails server'
          assert.equal object['reporter'], 'apiary'
          assert.equal object['custom']['apiaryApiKey'], 'key'
          assert.equal object['custom']['apiaryApiName'], 'name'

    describe 'when apiary config passed from cli', () ->
      before () ->
        answers =
          blueprint: 'apiary.apib',
          server: 'rails server',
          endpoint: 'http://localhost:3000',
          ciAdd: true

        config =
          '_': []
          reporter: 'apiary'
          custom:
            apiaryApiKey: '123123123'
            apiaryApiName: 'asdadqweqweq'


      describe 'config object passed to callback', () ->
        object = {}

        before (done) ->
          interactiveConfig.processAnswers config, answers, (config) ->
            object = config
            done()

        it 'should have properties set from the config on proper places', () ->
            assert.equal object['_'][0], 'apiary.apib'
            assert.equal object['_'][1], 'http://localhost:3000'

            assert.equal object['reporter'], 'apiary'
            assert.equal object['custom']['apiaryApiKey'], '123123123'
            assert.equal object['custom']['apiaryApiName'], 'asdadqweqweq'

  describe '.run(config, callback)', () ->
    it 'is a defined function', () ->
      assert.isFunction interactiveConfig.run


  describe '.updateCircle()', () ->

    beforeEach () ->
      sinon.stub fsStub, 'writeFileSync'

    afterEach () ->
      fsStub.writeFileSync.restore()

    it 'should save the file', () ->
      interactiveConfig.updateCircle()
      assert.isTrue fsStub.writeFileSync.called

    it 'should save proper config', () ->

  describe '.updateTravis()', () ->

    beforeEach () ->
      sinon.stub fsStub, 'writeFileSync'

    afterEach () ->
      fsStub.writeFileSync.restore()

    it 'should save the file', () ->
      interactiveConfig.updateTravis()
      assert.isTrue fsStub.writeFileSync.called









