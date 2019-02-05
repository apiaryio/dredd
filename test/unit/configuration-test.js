const clone = require('clone');
const { assert } = require('chai');

const configuration = require('../../lib/configuration');
const logger = require('../../lib/logger');
const reporterOutputLogger = require('../../lib/reporters/reporterOutputLogger');


const defaultLoggerConsole = clone(logger.transports.console);
const defaultReporterOutputLoggerConsole = clone(reporterOutputLogger.transports.console);

function resetLoggerConsoles() {
  logger.transports.console = defaultLoggerConsole;
  reporterOutputLogger.transports.console = defaultReporterOutputLoggerConsole;
}


describe('configuration.applyLoggingOptions()', () => {
  beforeEach(resetLoggerConsoles);
  afterEach(resetLoggerConsoles);

  describe('with color not set', () => {
    beforeEach(() => {
      configuration.applyLoggingOptions({});
    });

    it('the application logger should be set to colorize', () => {
      assert.isTrue(logger.transports.console.colorize);
    });
    it('the application output should be set to colorize', () => {
      assert.isTrue(reporterOutputLogger.transports.console.colorize);
    });
  });

  describe('with color set to true', () => {
    beforeEach(() => {
      configuration.applyLoggingOptions({ color: true });
    });

    it('the application logger should be set to colorize', () => {
      assert.isTrue(logger.transports.console.colorize);
    });
    it('the application output should be set to colorize', () => {
      assert.isTrue(reporterOutputLogger.transports.console.colorize);
    });
  });

  describe('with color set to false', () => {
    beforeEach(() => {
      configuration.applyLoggingOptions({ color: false });
    });

    it('the application logger should be set not to colorize', () => {
      assert.isFalse(logger.transports.console.colorize);
    });
    it('the application output should be set not to colorize', () => {
      assert.isFalse(reporterOutputLogger.transports.console.colorize);
    });
  });

  describe('with loglevel not set', () => {
    beforeEach(() => {
      configuration.applyLoggingOptions({});
    });

    it('the application logger level is set to warn', () => {
      assert.equal(logger.transports.console.level, 'warn');
    });
    it('the application output logger is not influenced', () => {
      assert.isFalse(reporterOutputLogger.transports.console.silent);
      assert.equal(reporterOutputLogger.transports.console.level, 'info');
    });
  });

  describe('with loglevel set to a valid value', () => {
    beforeEach(() => {
      configuration.applyLoggingOptions({ loglevel: 'error' });
    });

    it('the application logger level is set', () => {
      assert.equal(logger.transports.console.level, 'error');
    });
    it('the application output logger is not influenced', () => {
      assert.isFalse(reporterOutputLogger.transports.console.silent);
      assert.equal(reporterOutputLogger.transports.console.level, 'info');
    });
  });

  describe('with loglevel set to a valid value using uppercase', () => {
    beforeEach(() => {
      configuration.applyLoggingOptions({ loglevel: 'ERROR' });
    });

    it('the value is understood', () => {
      assert.equal(logger.transports.console.level, 'error');
    });
  });

  describe('with loglevel set to an invalid value', () => {
    it('throws an exception', () => {
      assert.throws(() => {
        configuration.applyLoggingOptions({ loglevel: 'verbose' });
      }, /verbose.+unsupported/i);
    });
  });

  describe('with loglevel set to silent', () => {
    beforeEach(() => {
      configuration.applyLoggingOptions({ loglevel: 'silent' });
    });

    it('the application logger gets silenced', () => {
      assert.isTrue(logger.transports.console.silent);
    });
    it('the application output logger is not influenced', () => {
      assert.isFalse(reporterOutputLogger.transports.console.silent);
      assert.equal(reporterOutputLogger.transports.console.level, 'info');
    });
  });

  describe('with loglevel set to warning', () => {
    beforeEach(() => {
      configuration.applyLoggingOptions({ loglevel: 'warning' });
    });

    it('the value is understood as warn', () => {
      assert.equal(logger.transports.console.level, 'warn');
    });
  });

  describe('with loglevel set to warn', () => {
    beforeEach(() => {
      configuration.applyLoggingOptions({ loglevel: 'warn' });
    });

    it('the application logger level is set to warn', () => {
      assert.equal(logger.transports.console.level, 'warn');
    });
    it('the application logger is not set to add timestamps', () => {
      assert.isFalse(logger.transports.console.timestamp);
    });
  });

  describe('with loglevel set to error', () => {
    beforeEach(() => {
      configuration.applyLoggingOptions({ loglevel: 'error' });
    });

    it('the application logger level is set to error', () => {
      assert.equal(logger.transports.console.level, 'error');
    });
    it('the application logger is not set to add timestamps', () => {
      assert.isFalse(logger.transports.console.timestamp);
    });
  });

  describe('with loglevel set to debug', () => {
    beforeEach(() => {
      configuration.applyLoggingOptions({ loglevel: 'debug' });
    });

    it('the application logger level is set to debug', () => {
      assert.equal(logger.transports.console.level, 'debug');
    });
    it('the application logger is set to add timestamps', () => {
      assert.isTrue(logger.transports.console.timestamp);
    });
  });
});


describe('configuration._coerceRemovedOptions()', () => {
  describe("with -c set to string 'true'", () => {
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions({
        options: { c: 'true' },
      });
    });

    it('gets coerced to color set to boolean true', () => {
      assert.deepEqual(coerceResult.config, { options: { color: true } });
    });
    it('produces no errors', () => {
      assert.deepEqual(coerceResult.errors, []);
    });
    it('produces one warning', () => {
      assert.lengthOf(coerceResult.warnings, 1);
    });
  });

  describe("with -c set to string 'false'", () => {
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions({
        options: { c: 'false' },
      });
    });

    it('gets coerced to color set to boolean false', () => {
      assert.deepEqual(coerceResult.config, { options: { color: false } });
    });
    it('produces no errors', () => {
      assert.deepEqual(coerceResult.errors, []);
    });
    it('produces one warning', () => {
      assert.lengthOf(coerceResult.warnings, 1);
    });
  });

  describe('with -c set to true', () => {
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions({
        options: { c: true },
      });
    });

    it('gets coerced to color set to boolean true', () => {
      assert.deepEqual(coerceResult.config, { options: { color: true } });
    });
    it('produces no errors', () => {
      assert.deepEqual(coerceResult.errors, []);
    });
    it('produces one warning', () => {
      assert.lengthOf(coerceResult.warnings, 1);
    });
  });

  describe('with -c set to false', () => {
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions({
        options: { c: false },
      });
    });

    it('gets coerced to color set to boolean false', () => {
      assert.deepEqual(coerceResult.config, { options: { color: false } });
    });
    it('produces no errors', () => {
      assert.deepEqual(coerceResult.errors, []);
    });
    it('produces one warning', () => {
      assert.lengthOf(coerceResult.warnings, 1);
    });
  });

  describe("with --color set to string 'true'", () => {
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions({
        options: { color: 'true' },
      });
    });

    it('gets coerced to color set to boolean true', () => {
      assert.deepEqual(coerceResult.config, { options: { color: true } });
    });
    it('produces no errors', () => {
      assert.deepEqual(coerceResult.errors, []);
    });
    it('produces one warning', () => {
      assert.lengthOf(coerceResult.warnings, 1);
    });
  });

  describe("with --color set to string 'false'", () => {
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions({
        options: { color: 'false' },
      });
    });

    it('gets coerced to color set to boolean false', () => {
      assert.deepEqual(coerceResult.config, { options: { color: false } });
    });
    it('produces no errors', () => {
      assert.deepEqual(coerceResult.errors, []);
    });
    it('produces one warning', () => {
      assert.lengthOf(coerceResult.warnings, 1);
    });
  });

  describe('with --color set to true', () => {
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions({
        options: { color: true },
      });
    });

    it('gets coerced to color set to boolean true', () => {
      assert.deepEqual(coerceResult.config, { options: { color: true } });
    });
    it('produces no errors', () => {
      assert.deepEqual(coerceResult.errors, []);
    });
    it('produces no warnings', () => {
      assert.deepEqual(coerceResult.warnings, []);
    });
  });

  describe('with --color set to false', () => {
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions({
        options: { color: false },
      });
    });

    it('gets coerced to color set to boolean false', () => {
      assert.deepEqual(coerceResult.config, { options: { color: false } });
    });
    it('produces no errors', () => {
      assert.deepEqual(coerceResult.errors, []);
    });
    it('produces no warnings', () => {
      assert.deepEqual(coerceResult.warnings, []);
    });
  });

  describe('with --level/-l set to a supported value', () => {
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions({
        options: { l: 'debug', level: 'debug' },
      });
    });

    it('gets coerced to loglevel set to the value', () => {
      assert.deepEqual(coerceResult.config, {
        options: { l: 'debug', loglevel: 'debug' },
      });
    });
    it('produces no errors', () => {
      assert.deepEqual(coerceResult.errors, []);
    });
    it('produces one warning', () => {
      assert.lengthOf(coerceResult.warnings, 1);
    });
  });

  describe('with --level/-l set to a consolidated value', () => {
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions({
        options: { l: 'verbose', level: 'verbose' },
      });
    });

    it('gets coerced to loglevel set to a corresponding value', () => {
      assert.deepEqual(coerceResult.config, {
        options: { l: 'debug', loglevel: 'debug' },
      });
    });
    it('produces no errors', () => {
      assert.deepEqual(coerceResult.errors, []);
    });
    it('produces two warnings', () => {
      assert.lengthOf(coerceResult.warnings, 2);
    });
  });

  describe('with --level/-l set to a removed value', () => {
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions({
        options: { l: 'complete', level: 'complete' },
      });
    });

    it('gets coerced to loglevel set to the default value', () => {
      assert.deepEqual(coerceResult.config, {
        options: { l: 'warn', loglevel: 'warn' },
      });
    });
    it('produces no errors', () => {
      assert.deepEqual(coerceResult.errors, []);
    });
    it('produces two warnings', () => {
      assert.lengthOf(coerceResult.warnings, 2);
    });
  });

  describe("with -l set to 'silent'", () => {
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions({
        options: { l: 'silent' },
      });
    });

    it('gets coerced to loglevel set to silent', () => {
      assert.deepEqual(coerceResult.config, {
        options: { l: 'silent', loglevel: 'silent' },
      });
    });
    it('produces no errors', () => {
      assert.deepEqual(coerceResult.errors, []);
    });
    it('produces no warnings', () => {
      assert.deepEqual(coerceResult.warnings, []);
    });
  });

  describe('with --timestamp/-t set', () => {
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions({
        options: { timestamp: true, t: true },
      });
    });

    it('gets coerced to loglevel set to debug', () => {
      assert.deepEqual(coerceResult.config, {
        options: { l: 'debug', loglevel: 'debug' },
      });
    });
    it('produces no errors', () => {
      assert.deepEqual(coerceResult.errors, []);
    });
    it('produces one warning', () => {
      assert.lengthOf(coerceResult.warnings, 1);
    });
  });

  describe('with --silent/-q set', () => {
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions({
        options: { silent: true, q: true },
      });
    });

    it('gets coerced to loglevel set to silent', () => {
      assert.deepEqual(coerceResult.config, {
        options: { l: 'silent', loglevel: 'silent' },
      });
    });
    it('produces no errors', () => {
      assert.deepEqual(coerceResult.errors, []);
    });
    it('produces one warning', () => {
      assert.lengthOf(coerceResult.warnings, 1);
    });
  });

  describe('with --sandbox/-b set', () => {
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions({
        options: { sandbox: true, b: true },
      });
    });

    it('gets removed', () => {
      assert.deepEqual(coerceResult.config, { options: {} });
    });
    it('produces one error', () => {
      assert.lengthOf(coerceResult.errors, 1);
    });
    it('produces no warnings', () => {
      assert.deepEqual(coerceResult.warnings, []);
    });
  });

  describe('with hooksData set', () => {
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions({
        hooksData: {},
      });
    });

    it('gets removed', () => {
      assert.deepEqual(coerceResult.config, {});
    });
    it('produces one error', () => {
      assert.lengthOf(coerceResult.errors, 1);
    });
    it('produces no warnings', () => {
      assert.deepEqual(coerceResult.warnings, []);
    });
  });

  describe('with blueprintPath set and empty path', () => {
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions({
        blueprintPath: 'foo/bar',
      });
    });

    it('gets reassigned as path', () => {
      assert.deepEqual(coerceResult.config, { options: { path: ['foo/bar'] } });
    });
    it('produces no errors', () => {
      assert.deepEqual(coerceResult.errors, []);
    });
    it('produces no warnings', () => {
      assert.lengthOf(coerceResult.warnings, 1);
    });
  });

  describe('with blueprintPath set and path set to a string', () => {
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions({
        blueprintPath: 'foo/bar',
        options: { path: 'moo.js' },
      });
    });

    it('gets reassigned as path', () => {
      assert.deepEqual(coerceResult.config, {
        options: { path: ['moo.js', 'foo/bar'] },
      });
    });
    it('produces no errors', () => {
      assert.deepEqual(coerceResult.errors, []);
    });
    it('produces no warnings', () => {
      assert.lengthOf(coerceResult.warnings, 1);
    });
  });

  describe('with blueprintPath set and path set to an array', () => {
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions({
        blueprintPath: 'foo/bar',
        options: { path: ['moo.js'] },
      });
    });

    it('gets reassigned as path', () => {
      assert.deepEqual(coerceResult.config, {
        options: { path: ['moo.js', 'foo/bar'] },
      });
    });
    it('produces no errors', () => {
      assert.deepEqual(coerceResult.errors, []);
    });
    it('produces no warnings', () => {
      assert.lengthOf(coerceResult.warnings, 1);
    });
  });
});
