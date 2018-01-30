/* eslint-disable
    no-return-assign,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const { EventEmitter } = require('events');

const { assert } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const loggerStub = require('../../src/logger');
const BaseReporterStub = sinon.spy(require('../../src/reporters/base-reporter'));
const XUnitReporterStub = sinon.spy(require('../../src/reporters/x-unit-reporter'));
const CliReporterStub = sinon.spy(require('../../src/reporters/cli-reporter'));
const DotReporterStub = sinon.spy(require('../../src/reporters/dot-reporter'));
const NyanCatReporterStub = sinon.spy(require('../../src/reporters/nyan-reporter'));
const HtmlReporterStub = sinon.spy(require('../../src/reporters/html-reporter'));
const MarkdownReporterStub = sinon.spy(require('../../src/reporters/markdown-reporter'));
const ApiaryReporterStub = sinon.spy(require('../../src/reporters/apiary-reporter'));

const emitterStub = new EventEmitter();

const configureReporters = proxyquire('../../src/configure-reporters', {
  './logger': loggerStub,
  './reporters/base-reporter': BaseReporterStub,
  './reporters/x-unit-reporter': XUnitReporterStub,
  './reporters/cli-reporter': CliReporterStub,
  './reporters/dot-reporter': DotReporterStub,
  './reporters/nyan-reporter': NyanCatReporterStub,
  './reporters/html-reporter': HtmlReporterStub,
  './reporters/markdown-reporter': MarkdownReporterStub,
  './reporters/apiary-reporter': ApiaryReporterStub
});

const resetStubs = function () {
  emitterStub.removeAllListeners();
  BaseReporterStub.reset();
  CliReporterStub.reset();
  XUnitReporterStub.reset();
  DotReporterStub.reset();
  NyanCatReporterStub.reset();
  HtmlReporterStub.reset();
  MarkdownReporterStub.reset();
  return ApiaryReporterStub.reset();
};


describe('configureReporters(config, stats, tests, onSaveCallback)', () => {
  const configuration = {
    emitter: emitterStub,
    options: {
      reporter: [],
      output: [],
      silent: false,
      'inline-errors': false
    }
  };

  before(() => loggerStub.transports.console.silent = true);

  after(() => loggerStub.transports.console.silent = false);

  describe('when there are no reporters', () => {
    beforeEach(() => resetStubs());

    it('should only add a CliReporter', (done) => {
      configureReporters(configuration, {}, {}, null);
      assert.isOk(CliReporterStub.called);
      return done();
    });

    return describe('when silent', () => {
      before(() => configuration.options.silent = true);

      after(() => configuration.options.silent = false);

      beforeEach(() => resetStubs());

      return it('should not add any reporters', (done) => {
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

    return it('should not add more than one cli-based reporters', (done) => {
      configureReporters(configuration, {}, {}, null);
      assert.notOk(CliReporterStub.called);
      return done();
    });
  });


  describe('when there are only file-based reporters', () => {
    before(() => configuration.options.reporter = ['xunit', 'markdown']);

    after(() => configuration.options.reporter = []);

    beforeEach(() => resetStubs());

    it('should add a CliReporter', (done) => {
      configureReporters(configuration, {}, {}, () => {});
      assert.isOk(CliReporterStub.called);
      return done();
    });

    describe('when the number of outputs is greater than or equals the number of reporters', () => {
      before(() => configuration.options.output = ['file1', 'file2', 'file3']);

      after(() => configuration.options.output = []);

      beforeEach(() => resetStubs());

      return it('should use the output paths in the order provided', (done) => {
        configureReporters(configuration, {}, {}, () => {});
        assert.isOk(XUnitReporterStub.calledWith(emitterStub, { fileBasedReporters: 2 }, {}, 'file1'));
        assert.isOk(MarkdownReporterStub.calledWith(emitterStub, { fileBasedReporters: 2 }, {}, 'file2'));
        return done();
      });
    });

    return describe('when the number of outputs is less than the number of reporters', () => {
      before(() => configuration.options.output = ['file1']);

      after(() => configuration.options.output = []);

      beforeEach(() => resetStubs());

      return it('should use the default output paths for the additional reporters', (done) => {
        configureReporters(configuration, {}, {}, () => {});
        assert.isOk(XUnitReporterStub.calledWith(emitterStub, { fileBasedReporters: 2 }, {}, 'file1'));
        assert.isOk(MarkdownReporterStub.calledWith(emitterStub, { fileBasedReporters: 2 }, {}, null));
        return done();
      });
    });
  });

  return describe('when there are both cli-based and file-based reporters', () => {
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

      return it('should use the output paths in the order provided', (done) => {
        configureReporters(configuration, {}, {}, () => {});
        assert.isOk(MarkdownReporterStub.calledWith(emitterStub, { fileBasedReporters: 2 }, {}, 'file1'));
        assert.isOk(HtmlReporterStub.calledWith(emitterStub, { fileBasedReporters: 2 }, {}, 'file2'));
        return done();
      });
    });

    return describe('when the number of outputs is less than the number of file-based reporters', () => {
      before(() => configuration.options.output = ['file1']);

      after(() => configuration.options.output = []);

      beforeEach(() => resetStubs());

      return it('should use the default output paths for the additional reporters', (done) => {
        configureReporters(configuration, {}, {}, () => {});
        assert.isOk(MarkdownReporterStub.calledWith(emitterStub, { fileBasedReporters: 2 }, {}, 'file1'));
        assert.isOk(HtmlReporterStub.calledWith(emitterStub, { fileBasedReporters: 2 }, {}, null));
        return done();
      });
    });
  });
});
