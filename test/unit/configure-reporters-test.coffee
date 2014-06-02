{EventEmitter} = require 'events'

{assert} = require 'chai'
sinon = require 'sinon'
proxyquire = require('proxyquire').noCallThru()

loggerStub = require '../../src/logger'
BaseReporterStub = sinon.spy  require '../../src/reporters/base-reporter'
XUnitReporterStub = sinon.spy  require '../../src/reporters/x-unit-reporter'
CliReporterStub = sinon.spy require '../../src/reporters/cli-reporter'
DotReporterStub = sinon.spy require '../../src/reporters/dot-reporter'
NyanCatReporterStub = sinon.spy require '../../src/reporters/nyan-reporter'
HtmlReporterStub = sinon.spy require '../../src/reporters/html-reporter'
MarkdownReporterStub = sinon.spy require '../../src/reporters/markdown-reporter'
ApiaryReporterStub = sinon.spy require '../../src/reporters/apiary-reporter'

emitterStub = new EventEmitter()

configureReporters = proxyquire '../../src/configure-reporters', {
  './logger' : loggerStub
  './reporters/base-reporter': BaseReporterStub
  './reporters/x-unit-reporter': XUnitReporterStub
  './reporters/cli-reporter': CliReporterStub
  './reporters/dot-reporter': DotReporterStub
  './reporters/nyan-reporter': NyanCatReporterStub
  './reporters/html-reporter': HtmlReporterStub
  './reporters/markdown-reporter': MarkdownReporterStub
  './reporters/apiary-reporter': ApiaryReporterStub
}

resetStubs = () ->
  emitterStub.removeAllListeners()
  BaseReporterStub.reset()
  CliReporterStub.reset()
  XUnitReporterStub.reset()
  DotReporterStub.reset()
  NyanCatReporterStub.reset()
  HtmlReporterStub.reset()
  MarkdownReporterStub.reset()
  ApiaryReporterStub.reset()


describe 'configureReporters(config, stats, tests, onSaveCallback)', () ->

  configuration =
    emitter: emitterStub
    options:
      reporter: []
      output: []
      silent: false
      'inline-errors': false

  before () ->
    loggerStub.transports.console.silent = true

  after () ->
    loggerStub.transports.console.silent = false

  describe 'when there are no reporters', () ->

    beforeEach () ->
      resetStubs()

    it 'should only add a CliReporter', (done) ->
      configureReporters(configuration, {}, {}, null)
      assert.ok CliReporterStub.called
      done()

    describe 'when silent', ()->

      before () ->
        configuration.options.silent = true

      after () ->
        configuration.options.silent = false

      beforeEach () ->
        resetStubs()

      it 'should not add any reporters', (done) ->
        configureReporters(configuration, {}, {}, null)
        assert.notOk CliReporterStub.called
        done()

  describe 'when there are only cli-based reporters', () ->

    before () ->
      configuration.options.reporter = ['dot', 'nyan']

    after () ->
      configuration.options.reporter = []

    beforeEach () ->
      resetStubs()

    it 'should add a cli-based reporter', (done) ->
      configureReporters(configuration, {}, {}, null)
      assert.ok DotReporterStub.called
      done()

    it 'should not add more than one cli-based reporters', (done) ->
      configureReporters(configuration, {}, {}, null)
      assert.notOk CliReporterStub.called
      done()


  describe 'when there are only file-based reporters', () ->

    before () ->
      configuration.options.reporter = ['junit', 'markdown']

    after () ->
      configuration.options.reporter = []

    beforeEach () ->
      resetStubs()

    it 'should add a CliReporter', (done) ->
      configureReporters(configuration, {}, {}, () -> )
      assert.ok CliReporterStub.called
      done()

    describe 'when the number of outputs is greater than or equals the number of reporters', () ->

      before () ->
        configuration.options.output = ['file1', 'file2', 'file3']

      after () ->
        configuration.options.output = []

      beforeEach () ->
        resetStubs()

      it 'should use the output paths in the order provided', (done) ->
        configureReporters(configuration, {}, {}, () -> )
        assert.ok XUnitReporterStub.calledWith(emitterStub, {'fileBasedReporters': 2}, {}, 'file1')
        assert.ok MarkdownReporterStub.calledWith(emitterStub, {'fileBasedReporters': 2}, {}, 'file2')
        done()

    describe 'when the number of outputs is less than the number of reporters', () ->

      before () ->
        configuration.options.output = ['file1']

      after () ->
        configuration.options.output = []

      beforeEach () ->
        resetStubs()

      it 'should use the default output paths for the additional reporters', (done) ->
        configureReporters(configuration, {}, {}, () -> )
        assert.ok XUnitReporterStub.calledWith(emitterStub, {'fileBasedReporters': 2}, {}, 'file1')
        assert.ok MarkdownReporterStub.calledWith(emitterStub, {'fileBasedReporters': 2}, {}, null)
        done()

  describe 'when there are both cli-based and file-based reporters', () ->

    before () ->
      configuration.options.reporter = ['nyan', 'markdown', 'html']

    after () ->
      configuration.options.reporter = []

    beforeEach () ->
      resetStubs()

    it 'should add a cli-based reporter', (done) ->
      configureReporters(configuration, {}, {}, () ->)
      assert.ok NyanCatReporterStub.called
      done()

    it 'should not add more than one cli-based reporters', (done) ->
      configureReporters(configuration, {}, {}, () ->)
      assert.notOk CliReporterStub.called
      assert.notOk DotReporterStub.called
      done()

    describe 'when the number of outputs is greather than or equals the number of file-based reporters', () ->

      before () ->
        configuration.options.output = ['file1', 'file2']

      after () ->
        configuration.options.output = []

      beforeEach () ->
        resetStubs()

      it 'should use the output paths in the order provided', (done) ->
        configureReporters(configuration, {}, {}, () -> )
        assert.ok MarkdownReporterStub.calledWith(emitterStub, {'fileBasedReporters': 2}, {}, 'file1')
        assert.ok HtmlReporterStub.calledWith(emitterStub, {'fileBasedReporters': 2}, {}, 'file2')
        done()

    describe 'when the number of outputs is less than the number of file-based reporters', () ->
      before () ->
        configuration.options.output = ['file1']

      after () ->
        configuration.options.output = []

      beforeEach () ->
        resetStubs()

      it 'should use the default output paths for the additional reporters', (done) ->
        configureReporters(configuration, {}, {}, () -> )
        assert.ok MarkdownReporterStub.calledWith(emitterStub, {'fileBasedReporters': 2}, {}, 'file1')
        assert.ok HtmlReporterStub.calledWith(emitterStub, {'fileBasedReporters': 2}, {}, null)
        done()
