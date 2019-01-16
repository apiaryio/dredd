/* eslint-disable
    no-return-assign,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const { EventEmitter } = require('events');

const { assert } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const loggerStub = require('../../lib/logger');
const BaseReporterStub = sinon.spy(require('../../lib/reporters/BaseReporter'));
const XUnitReporterStub = sinon.spy(require('../../lib/reporters/XUnitReporter'));
const CliReporterStub = sinon.spy(require('../../lib/reporters/CLIReporter'));
const DotReporterStub = sinon.spy(require('../../lib/reporters/DotReporter'));
const NyanCatReporterStub = sinon.spy(require('../../lib/reporters/NyanReporter'));
const HtmlReporterStub = sinon.spy(require('../../lib/reporters/HTMLReporter'));
const MarkdownReporterStub = sinon.spy(require('../../lib/reporters/MarkdownReporter'));
const ApiaryReporterStub = sinon.spy(require('../../lib/reporters/ApiaryReporter'));

const emitterStub = new EventEmitter();

const configureReporters = proxyquire('../../lib/configureReporters', {
  './logger': loggerStub,
  './reporters/BaseReporter': BaseReporterStub,
  './reporters/XUnitReporter': XUnitReporterStub,
  './reporters/CLIReporter': CliReporterStub,
  './reporters/DotReporter': DotReporterStub,
  './reporters/NyanReporter': NyanCatReporterStub,
  './reporters/HTMLReporter': HtmlReporterStub,
  './reporters/MarkdownReporter': MarkdownReporterStub,
  './reporters/ApiaryReporter': ApiaryReporterStub,
});

function resetStubs() {
  emitterStub.removeAllListeners();
  BaseReporterStub.resetHistory();
  CliReporterStub.resetHistory();
  XUnitReporterStub.resetHistory();
  DotReporterStub.resetHistory();
  NyanCatReporterStub.resetHistory();
  HtmlReporterStub.resetHistory();
  MarkdownReporterStub.resetHistory();
  return ApiaryReporterStub.resetHistory();
}


describe('configureReporters(config, stats, tests, onSaveCallback)', () => {
  const configuration = {
    emitter: emitterStub,
    options: {
      reporter: [],
      output: [],
      silent: false,
      'inline-errors': false,
    },
  };

  before(() => loggerStub.transports.console.silent = true);

  after(() => loggerStub.transports.console.silent = false);

  describe('when there are no reporters', () => {
    beforeEach(() => resetStubs());

    it('should only add a CLIReporter', (done) => {
      configureReporters(configuration, {}, {}, null);
      assert.isOk(CliReporterStub.called);
      return done();
    });

    describe('when silent', () => {
      before(() => configuration.options.silent = true);

      after(() => configuration.options.silent = false);

      beforeEach(() => resetStubs());

      it('should not add any reporters', (done) => {
        configureReporters(configuration, {}, {}, null);
        assert.notOk(CliReporterStub.called);
        return done();
      });
    });
  });

  describe('when there are only cli-based reporters', () => {
    before(() => configuration.options.reporter = ['dot', 'nyan']);

    after(() => configuration.options.reporter = []);

    beforeEach(() => resetStubs());

    it('should add a cli-based reporter', (done) => {
      configureReporters(configuration, {}, {}, null);
      assert.isOk(DotReporterStub.called);
      return done();
    });

    it('should not add more than one cli-based reporters', (done) => {
      configureReporters(configuration, {}, {}, null);
      assert.notOk(CliReporterStub.called);
      return done();
    });
  });


  describe('when there are only file-based reporters', () => {
    before(() => configuration.options.reporter = ['xunit', 'markdown']);

    after(() => configuration.options.reporter = []);

    beforeEach(() => resetStubs());

    it('should add a CLIReporter', (done) => {
      configureReporters(configuration, {}, {}, () => {});
      assert.isOk(CliReporterStub.called);
      return done();
    });

    describe('when the number of outputs is greater than or equals the number of reporters', () => {
      before(() => configuration.options.output = ['file1', 'file2', 'file3']);

      after(() => configuration.options.output = []);

      beforeEach(() => resetStubs());

      it('should use the output paths in the order provided', (done) => {
        configureReporters(configuration, {}, {}, () => {});
        assert.isOk(XUnitReporterStub.calledWith(emitterStub, { fileBasedReporters: 2 }, {}, 'file1'));
        assert.isOk(MarkdownReporterStub.calledWith(emitterStub, { fileBasedReporters: 2 }, {}, 'file2'));
        return done();
      });
    });

    describe('when the number of outputs is less than the number of reporters', () => {
      before(() => configuration.options.output = ['file1']);

      after(() => configuration.options.output = []);

      beforeEach(() => resetStubs());

      it('should use the default output paths for the additional reporters', (done) => {
        configureReporters(configuration, {}, {}, () => {});
        assert.isOk(XUnitReporterStub.calledWith(emitterStub, { fileBasedReporters: 2 }, {}, 'file1'));
        assert.isOk(MarkdownReporterStub.calledWith(emitterStub, { fileBasedReporters: 2 }, {}, undefined));
        return done();
      });
    });
  });

  describe('when there are both cli-based and file-based reporters', () => {
    before(() => configuration.options.reporter = ['nyan', 'markdown', 'html']);

    after(() => configuration.options.reporter = []);

    beforeEach(() => resetStubs());

    it('should add a cli-based reporter', (done) => {
      configureReporters(configuration, {}, {}, () => {});
      assert.isOk(NyanCatReporterStub.called);
      return done();
    });

    it('should not add more than one cli-based reporters', (done) => {
      configureReporters(configuration, {}, {}, () => {});
      assert.notOk(CliReporterStub.called);
      assert.notOk(DotReporterStub.called);
      return done();
    });

    describe('when the number of outputs is greather than or equals the number of file-based reporters', () => {
      before(() => configuration.options.output = ['file1', 'file2']);

      after(() => configuration.options.output = []);

      beforeEach(() => resetStubs());

      it('should use the output paths in the order provided', (done) => {
        configureReporters(configuration, {}, {}, () => {});
        assert.isOk(MarkdownReporterStub.calledWith(emitterStub, { fileBasedReporters: 2 }, {}, 'file1'));
        assert.isOk(HtmlReporterStub.calledWith(emitterStub, { fileBasedReporters: 2 }, {}, 'file2'));
        return done();
      });
    });

    describe('when the number of outputs is less than the number of file-based reporters', () => {
      before(() => configuration.options.output = ['file1']);

      after(() => configuration.options.output = []);

      beforeEach(() => resetStubs());

      it('should use the default output paths for the additional reporters', (done) => {
        configureReporters(configuration, {}, {}, () => {});
        assert.isOk(MarkdownReporterStub.calledWith(emitterStub, { fileBasedReporters: 2 }, {}, 'file1'));
        assert.isOk(HtmlReporterStub.calledWith(emitterStub, { fileBasedReporters: 2 }, {}, undefined));
        return done();
      });
    });
  });
});
