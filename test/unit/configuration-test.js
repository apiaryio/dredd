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
    const config = { options: { c: 'true' } };
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions(config);
    });

    it('gets removed', () => {
      assert.deepEqual(config, { options: {} });
    });
    it('produces no warnings', () => {
      assert.lengthOf(coerceResult.warnings, 0);
    });
    it('produces one error', () => {
      assert.lengthOf(coerceResult.errors, 1);
    });
  });

  describe("with --color set to string 'true'", () => {
    const config = { options: { color: 'true' } };
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions(config);
    });

    it('gets coerced to color set to boolean true', () => {
      assert.deepEqual(config, { options: { color: true } });
    });
    it('produces no warnings', () => {
      assert.lengthOf(coerceResult.warnings, 0);
    });
    it('produces no errors', () => {
      assert.lengthOf(coerceResult.errors, 0);
    });
  });

  describe("with --color set to string 'false'", () => {
    const config = { options: { color: 'false' } };
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions(config);
    });

    it('gets coerced to color set to boolean false', () => {
      assert.deepEqual(config, { options: { color: false } });
    });
    it('produces no warnings', () => {
      assert.lengthOf(coerceResult.warnings, 0);
    });
    it('produces no errors', () => {
      assert.lengthOf(coerceResult.errors, 0);
    });
  });

  describe('with --color set to true', () => {
    const config = { options: { color: true } };
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions(config);
    });

    it('gets coerced to color set to boolean true', () => {
      assert.deepEqual(config, { options: { color: true } });
    });
    it('produces no errors', () => {
      assert.lengthOf(coerceResult.errors, 0);
    });
    it('produces no warnings', () => {
      assert.lengthOf(coerceResult.warnings, 0);
    });
  });

  describe('with --color set to false', () => {
    const config = { options: { color: false } };
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions(config);
    });

    it('gets coerced to color set to boolean false', () => {
      assert.deepEqual(config, { options: { color: false } });
    });
    it('produces no errors', () => {
      assert.lengthOf(coerceResult.errors, 0);
    });
    it('produces no warnings', () => {
      assert.lengthOf(coerceResult.warnings, 0);
    });
  });

  describe('with --level/-l set to a supported value', () => {
    const config = { options: { l: 'debug', level: 'debug' } };
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions(config);
    });

    it('gets coerced to loglevel set to the value', () => {
      assert.deepEqual(config, {
        options: { l: 'debug', loglevel: 'debug' },
      });
    });
    it('produces no warnings', () => {
      assert.lengthOf(coerceResult.warnings, 0);
    });
    it('produces one error', () => {
      assert.lengthOf(coerceResult.errors, 1);
    });
  });

  describe('with --level/-l set to a consolidated value', () => {
    const config = { options: { l: 'verbose', level: 'verbose' } };
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions(config);
    });

    it('gets coerced to loglevel set to a corresponding value', () => {
      assert.deepEqual(config, {
        options: { l: 'debug', loglevel: 'debug' },
      });
    });
    it('produces one error', () => {
      assert.lengthOf(coerceResult.errors, 1);
    });
  });

  describe('with --level/-l set to a removed value', () => {
    const config = { options: { l: 'complete', level: 'complete' } };
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions(config);
    });

    it('gets coerced to loglevel set to the default value', () => {
      assert.deepEqual(config, {
        options: { l: 'warn', loglevel: 'warn' },
      });
    });
    it('produces one error', () => {
      assert.lengthOf(coerceResult.errors, 1);
    });
  });

  describe("with -l set to 'silent'", () => {
    const config = { options: { l: 'silent' } };
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions(config);
    });

    it('gets coerced to loglevel set to silent', () => {
      assert.deepEqual(config, {
        options: { l: 'silent', loglevel: 'silent' },
      });
    });
    it('produces no errors', () => {
      assert.lengthOf(coerceResult.errors, 0);
    });
    it('produces no warnings', () => {
      assert.lengthOf(coerceResult.warnings, 0);
    });
  });

  describe('with --timestamp/-t set', () => {
    const config = { options: { timestamp: true, t: true } };
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions(config);
    });

    it('gets removed', () => {
      assert.deepEqual(config, {
        options: {},
      });
    });
    it('produces one error', () => {
      assert.lengthOf(coerceResult.errors, 1);
    });
    it('produces no warnings', () => {
      assert.lengthOf(coerceResult.warnings, 0);
    });
  });

  describe('with --silent/-q set', () => {
    const config = { options: { silent: true, q: true } };
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions(config);
    });

    it('gets removed', () => {
      assert.deepEqual(config, {
        options: {},
      });
    });
    it('produces one error', () => {
      assert.lengthOf(coerceResult.errors, 1);
    });
    it('produces no warnings', () => {
      assert.lengthOf(coerceResult.warnings, 0);
    });
  });

  describe('with --sandbox/-b set', () => {
    const config = { options: { sandbox: true, b: true } };
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions(config);
    });

    it('gets removed', () => {
      assert.deepEqual(config, { options: {} });
    });
    it('produces one error', () => {
      assert.lengthOf(coerceResult.errors, 1);
    });
    it('produces no warnings', () => {
      assert.lengthOf(coerceResult.warnings, 0);
    });
  });

  describe('with data set to { filename: apiDescription }', () => {
    const config = { data: { 'filename.api': 'FORMAT: 1A\n# Sample API\n' } };
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions(config);
    });

    it('gets reformatted', () => {
      assert.deepEqual(config, {
        apiDescriptions: [
          {
            location: 'filename.api',
            content: 'FORMAT: 1A\n# Sample API\n',
          },
        ],
      });
    });
    it('produces no errors', () => {
      assert.lengthOf(coerceResult.errors, 0);
    });
    it('produces one warning', () => {
      assert.lengthOf(coerceResult.warnings, 1);
    });
  });

  describe('with data set to { filename: { filename, raw: apiDescription } }', () => {
    const config = {
      data: {
        'filename.api': {
          raw: 'FORMAT: 1A\n# Sample API\n',
          filename: 'filename.api',
        },
      },
    };
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions(config);
    });

    it('gets reformatted', () => {
      assert.deepEqual(config, {
        apiDescriptions: [
          {
            location: 'filename.api',
            content: 'FORMAT: 1A\n# Sample API\n',
          },
        ],
      });
    });
    it('produces no errors', () => {
      assert.lengthOf(coerceResult.errors, 0);
    });
    it('produces one warning', () => {
      assert.lengthOf(coerceResult.warnings, 1);
    });
  });

  describe('with both data and apiDescriptions set', () => {
    const config = {
      data: { 'filename.api': 'FORMAT: 1A\n# Sample API v1\n' },
      apiDescriptions: [{
        location: 'configuration.apiDescriptions[0]',
        content: 'FORMAT: 1A\n# Sample API v2\n',
      }],
    };
    let coerceResult;

    before(() => {
      coerceResult = configuration._coerceRemovedOptions(config);
    });

    it('gets reformatted', () => {
      assert.deepEqual(config, {
        apiDescriptions: [
          {
            location: 'configuration.apiDescriptions[0]',
            content: 'FORMAT: 1A\n# Sample API v2\n',
          },
          {
            location: 'filename.api',
            content: 'FORMAT: 1A\n# Sample API v1\n',
          },
        ],
      });
    });
    it('produces no errors', () => {
      assert.lengthOf(coerceResult.errors, 0);
    });
    it('produces one warning', () => {
      assert.lengthOf(coerceResult.warnings, 1);
    });
  });
});
