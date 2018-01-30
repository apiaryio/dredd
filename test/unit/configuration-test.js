const {assert} = require('chai');
const clone = require('clone');

const configuration = require('../../src/configuration');
const logger = require('../../src/logger');


describe('configuration.applyLoggingOptions()', function() {
  let loggerSettings = undefined;
  let config = undefined;

  beforeEach( () => loggerSettings = clone(logger.transports.console));
  afterEach( () => logger.transports.console = loggerSettings);

  it('applies logging options', function() {
    config = configuration.applyLoggingOptions({
      color: 'true',
      level: 'debug'
    });

    assert.propertyVal(config, 'color', true);
    assert.equal(logger.transports.console.colorize, true);

    assert.propertyVal(config, 'level', 'debug');
    return assert.equal(logger.transports.console.level, 'debug');
  });

  describe('with color set to legacy \'true\' string value', () =>
    it('resulting configuration should contain \'color\' set to boolean true', function() {
      const options = configuration.applyLoggingOptions({color: 'true'});
      return assert.propertyVal(options, 'color', true);
    })
  );

  return describe('with color option set to legacy \'false\' string value', () =>
    it('resulting configuration should contain \'color\' set to boolean false', function() {
      const options = configuration.applyLoggingOptions({color: 'false'});
      return assert.propertyVal(options, 'color', false);
    })
  );
});


describe('configuration.applyConfiguration()', function() {
  let loggerSettings = undefined;
  let config = undefined;

  beforeEach( () => loggerSettings = clone(logger.transports.console));
  afterEach( () => logger.transports.console = loggerSettings);

  return it('applies logging options', function() {
    config = configuration.applyConfiguration({
      options: {
        color: 'true',
        level: 'debug'
      }
    });

    assert.nestedPropertyVal(config, 'options.color', true);
    assert.equal(logger.transports.console.colorize, true);

    assert.nestedPropertyVal(config, 'options.level', 'debug');
    return assert.equal(logger.transports.console.level, 'debug');
  });
});
