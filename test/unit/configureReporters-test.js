/* eslint-disable
    no-return-assign,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
import { EventEmitter } from 'events';

import { assert } from 'chai';
import sinon from 'sinon';
import { noCallThru } from 'proxyquire';

import loggerStub from '../../lib/logger';
import BaseReporter from '../../lib/reporters/BaseReporter';
import XUnitReporter from '../../lib/reporters/XUnitReporter';
import CLIReporter from '../../lib/reporters/CLIReporter';
import DotReporter from '../../lib/reporters/DotReporter';
import NyanReporter from '../../lib/reporters/NyanReporter';
import HTMLReporter from '../../lib/reporters/HTMLReporter';
import MarkdownReporter from '../../lib/reporters/MarkdownReporter';
import ApiaryReporter from '../../lib/reporters/ApiaryReporter';

const proxyquire = noCallThru();
const BaseReporterStub = sinon.spy(BaseReporter);
const XUnitReporterStub = sinon.spy(XUnitReporter);
const CliReporterStub = sinon.spy(CLIReporter);
const DotReporterStub = sinon.spy(DotReporter);
const NyanCatReporterStub = sinon.spy(NyanReporter);
const HtmlReporterStub = sinon.spy(HTMLReporter);
const MarkdownReporterStub = sinon.spy(MarkdownReporter);
const ApiaryReporterStub = sinon.spy(ApiaryReporter);

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
}).default;

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

describe('configureReporters()', () => {
  const configuration = {
    emitter: emitterStub,
    reporter: [],
    output: [],
    'inline-errors': false,
  };

  before(() => (loggerStub.transports.console.silent = true));

  after(() => (loggerStub.transports.console.silent = false));

  describe('when there are no reporters', () => {
    beforeEach(() => resetStubs());

    it('should only add a CLIReporter', (done) => {
      configureReporters(configuration, {}, null);
      assert.isOk(CliReporterStub.called);
      return done();
    });

    describe('when silent', () => {
      before(() => (configuration.loglevel = 'silent'));

      after(() => (configuration.loglevel = 'silent'));

      beforeEach(() => resetStubs());

      it('should still add reporters', (done) => {
        configureReporters(configuration, {}, null);
        assert.ok(CliReporterStub.called);
        return done();
      });
    });
  });

  describe('when there are only cli-based reporters', () => {
    before(() => (configuration.reporter = ['dot', 'nyan']));

    after(() => (configuration.reporter = []));

    beforeEach(() => resetStubs());

    it('should add a cli-based reporter', (done) => {
      configureReporters(configuration, {}, null);
      assert.isOk(DotReporterStub.called);
      return done();
    });

    it('should not add more than one cli-based reporters', (done) => {
      configureReporters(configuration, {}, null);
      assert.notOk(CliReporterStub.called);
      return done();
    });
  });

  describe('when there are only file-based reporters', () => {
    before(() => (configuration.reporter = ['xunit', 'markdown']));

    after(() => (configuration.reporter = []));

    beforeEach(() => resetStubs());

    it('should add a CLIReporter', (done) => {
      configureReporters(configuration, {}, () => {});
      assert.isOk(CliReporterStub.called);
      return done();
    });

    describe('when the number of outputs is greater than or equals the number of reporters', () => {
      before(() => (configuration.output = ['file1', 'file2', 'file3']));

      after(() => (configuration.output = []));

      beforeEach(() => resetStubs());

      it('should use the output paths in the order provided', (done) => {
        configureReporters(configuration, {}, () => {});
        assert.isOk(
          XUnitReporterStub.calledWith(
            emitterStub,
            { fileBasedReporters: 2 },
            'file1',
          ),
        );
        assert.isOk(
          MarkdownReporterStub.calledWith(
            emitterStub,
            { fileBasedReporters: 2 },
            'file2',
          ),
        );
        return done();
      });
    });

    describe('when the number of outputs is less than the number of reporters', () => {
      before(() => (configuration.output = ['file1']));

      after(() => (configuration.output = []));

      beforeEach(() => resetStubs());

      it('should use the default output paths for the additional reporters', (done) => {
        configureReporters(configuration, {}, () => {});
        assert.isOk(
          XUnitReporterStub.calledWith(
            emitterStub,
            { fileBasedReporters: 2 },
            'file1',
          ),
        );
        assert.isOk(
          MarkdownReporterStub.calledWith(
            emitterStub,
            { fileBasedReporters: 2 },
            undefined,
          ),
        );
        return done();
      });
    });
  });

  describe('when there are both cli-based and file-based reporters', () => {
    before(() => (configuration.reporter = ['nyan', 'markdown', 'html']));

    after(() => (configuration.reporter = []));

    beforeEach(() => resetStubs());

    it('should add a cli-based reporter', (done) => {
      configureReporters(configuration, {}, () => {});
      assert.isOk(NyanCatReporterStub.called);
      return done();
    });

    it('should not add more than one cli-based reporters', (done) => {
      configureReporters(configuration, {}, () => {});
      assert.notOk(CliReporterStub.called);
      assert.notOk(DotReporterStub.called);
      return done();
    });

    describe('when the number of outputs is greather than or equals the number of file-based reporters', () => {
      before(() => (configuration.output = ['file1', 'file2']));

      after(() => (configuration.output = []));

      beforeEach(() => resetStubs());

      it('should use the output paths in the order provided', (done) => {
        configureReporters(configuration, {}, () => {});
        assert.isOk(
          MarkdownReporterStub.calledWith(
            emitterStub,
            { fileBasedReporters: 2 },
            'file1',
          ),
        );
        assert.isOk(
          HtmlReporterStub.calledWith(
            emitterStub,
            { fileBasedReporters: 2 },
            'file2',
          ),
        );
        return done();
      });
    });

    describe('when the number of outputs is less than the number of file-based reporters', () => {
      before(() => (configuration.output = ['file1']));

      after(() => (configuration.output = []));

      beforeEach(() => resetStubs());

      it('should use the default output paths for the additional reporters', (done) => {
        configureReporters(configuration, {}, () => {});
        assert.isOk(
          MarkdownReporterStub.calledWith(
            emitterStub,
            { fileBasedReporters: 2 },
            'file1',
          ),
        );
        assert.isOk(
          HtmlReporterStub.calledWith(
            emitterStub,
            { fileBasedReporters: 2 },
            undefined,
          ),
        );
        return done();
      });
    });
  });
});
