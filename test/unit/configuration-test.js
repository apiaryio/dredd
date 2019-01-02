const clone = require('clone');
const { assert } = require('chai');

const configuration = require('../../lib/configuration');
const logger = require('../../lib/logger');

describe('configuration.applyLoggingOptions()', () => {
  let loggerSettings;
  let config;

  beforeEach(() => { loggerSettings = clone(logger.transports.console); });
  afterEach(() => { logger.transports.console = loggerSettings; });

  it('applies logging options', () => {
    config = configuration.applyLoggingOptions({
      color: 'true',
      level: 'debug',
    });

    assert.propertyVal(config, 'color', true);
    assert.equal(logger.transports.console.colorize, true);

    assert.propertyVal(config, 'level', 'debug');
    assert.equal(logger.transports.console.level, 'debug');
  });

  describe('with color set to legacy \'true\' string value', () => it('resulting configuration should contain \'color\' set to boolean true', () => {
    const options = configuration.applyLoggingOptions({ color: 'true' });
    assert.propertyVal(options, 'color', true);
  }));

  describe('with color option set to legacy \'false\' string value', () => it('resulting configuration should contain \'color\' set to boolean false', () => {
    const options = configuration.applyLoggingOptions({ color: 'false' });
    assert.propertyVal(options, 'color', false);
  }));
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
        level: 'debug',
      },
    });

    assert.nestedPropertyVal(config, 'options.color', true);
    assert.equal(logger.transports.console.colorize, true);

    assert.nestedPropertyVal(config, 'options.level', 'debug');
    assert.equal(logger.transports.console.level, 'debug');
  });
});
