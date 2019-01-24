const clone = require('clone');
const { assert } = require('chai');

const configuration = require('../../lib/configuration');
const logger = require('../../lib/logger');
const reporterOutputLogger = require('../../lib/reporters/reporterOutputLogger');


describe('configuration.applyLoggingOptions()', () => {
  let loggerSettings;
  let reporterOutputLoggerSettings;

  beforeEach(() => {
    loggerSettings = clone(logger.transports.console);
    reporterOutputLoggerSettings = clone(reporterOutputLogger.transports.console);
  });
  afterEach(() => {
    logger.transports.console = loggerSettings;
    reporterOutputLogger.transports.console = reporterOutputLoggerSettings;
  });

  describe('with color set to true', () => {
    let options;

    beforeEach(() => {
      options = configuration.applyLoggingOptions({ color: true });
    });

    it('resulting configuration should contain \'color\' set to boolean true', () => {
      assert.isTrue(options.color);
    });

    it('the application logger should be set to colorize', () => {
      assert.isTrue(logger.transports.console.colorize);
    });

    it('the application output should be set to colorize', () => {
      assert.isTrue(reporterOutputLogger.transports.console.colorize);
    });
  });

  describe('with color set to \'true\' string value', () => {
    let options;

    beforeEach(() => {
      options = configuration.applyLoggingOptions({ color: 'true' });
    });

    it('resulting configuration should contain \'color\' set to boolean true', () => {
      assert.isTrue(options.color);
    });

    it('the application logger should be set to colorize', () => {
      assert.isTrue(logger.transports.console.colorize);
    });

    it('the application output should be set to colorize', () => {
      assert.isTrue(reporterOutputLogger.transports.console.colorize);
    });
  });

  describe('with color set to false', () => {
    let options;

    beforeEach(() => {
      options = configuration.applyLoggingOptions({ color: false });
    });

    it('resulting configuration should contain \'color\' set to boolean false', () => {
      assert.isFalse(options.color);
    });

    it('the application logger should be set not to colorize', () => {
      assert.isFalse(logger.transports.console.colorize);
    });

    it('the application output should be set not to colorize', () => {
      assert.isFalse(reporterOutputLogger.transports.console.colorize);
    });
  });

  describe('with color set to \'false\' string value', () => {
    let options;

    beforeEach(() => {
      options = configuration.applyLoggingOptions({ color: 'false' });
    });

    it('resulting configuration should contain \'color\' set to boolean false', () => {
      assert.isFalse(options.color);
    });

    it('the application logger should be set not to colorize', () => {
      assert.isFalse(logger.transports.console.colorize);
    });

    it('the application output should be set not to colorize', () => {
      assert.isFalse(reporterOutputLogger.transports.console.colorize);
    });
  });

  describe('with timestamp set to true', () => {
    beforeEach(() => {
      configuration.applyLoggingOptions({ timestamp: true });
    });

    it('the application logger should be set to add timestamps', () => {
      assert.isTrue(logger.transports.console.timestamp);
    });

    it('the application output should be set to add timestamps', () => {
      assert.isTrue(reporterOutputLogger.transports.console.timestamp);
    });
  });

  describe('with timestamp set to false', () => {
    beforeEach(() => {
      configuration.applyLoggingOptions({ timestamp: false });
    });

    it('the application logger should be set not to add timestamps', () => {
      assert.isFalse(logger.transports.console.timestamp);
    });

    it('the application output should be set not to add timestamps', () => {
      assert.isFalse(reporterOutputLogger.transports.console.timestamp);
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

    it('the application logger level is set', () => {
      assert.equal(logger.transports.console.level, 'error');
    });
  });

  describe('with loglevel set to an invalid value', () => {
    it('throws an exception', () => {
      assert.throws(() => {
        configuration.applyLoggingOptions({ loglevel: 'verbose' });
      }, /unsupported.+verbose/i);
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

  describe('with loglevel set to warn', () => {
    beforeEach(() => {
      configuration.applyLoggingOptions({ loglevel: 'warn' });
    });

    it('the application logger level is set to warn', () => {
      assert.equal(logger.transports.console.level, 'warn');
    });
  });

  describe('with loglevel set to warning', () => {
    beforeEach(() => {
      configuration.applyLoggingOptions({ loglevel: 'warning' });
    });

    it('the application logger level is set to warn', () => {
      assert.equal(logger.transports.console.level, 'warn');
    });
  });

  describe('with loglevel set to error', () => {
    beforeEach(() => {
      configuration.applyLoggingOptions({ loglevel: 'error' });
    });

    it('the application logger level is set to error', () => {
      assert.equal(logger.transports.console.level, 'error');
    });
  });

  describe('with loglevel set to debug', () => {
    beforeEach(() => {
      configuration.applyLoggingOptions({ loglevel: 'debug' });
    });

    it('the application logger level is set to debug', () => {
      assert.equal(logger.transports.console.level, 'debug');
    });
  });
});

describe('configuration.applyConfiguration()', () => {
  let loggerSettings;
  let config;

  beforeEach(() => { loggerSettings = clone(logger.transports.console); });
  afterEach(() => { logger.transports.console = loggerSettings; });

  it('applies logging options', () => {
    config = configuration.applyConfiguration({
      options: {
        color: 'true',
        loglevel: 'debug',
      },
    });

    assert.nestedPropertyVal(config, 'options.color', true);
    assert.equal(logger.transports.console.colorize, true);

    assert.nestedPropertyVal(config, 'options.loglevel', 'debug');
    assert.equal(logger.transports.console.level, 'debug');
  });
});
