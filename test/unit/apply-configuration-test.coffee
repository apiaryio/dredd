{assert} = require('chai')
clone = require('clone')

applyConfiguration = require('../../src/apply-configuration')
logger = require('../../src/logger')


describe('applyLoggingOptions()', ->
  loggerSettings = undefined
  config = undefined

  beforeEach( ->
    loggerSettings = clone(logger.transports.console)
  )
  afterEach( ->
    logger.transports.console = loggerSettings
  )

  it('applies logging options', ->
    config = applyConfiguration.applyLoggingOptions(
      color: 'true'
      level: 'debug'
    )

    assert.propertyVal(config, 'color', true)
    assert.equal(logger.transports.console.colorize, true)

    assert.propertyVal(config, 'level', 'debug')
    assert.equal(logger.transports.console.level, 'debug')
  )

  describe('with color set to legacy \'true\' string value', ->
    it('resulting configuration should contain \'color\' set to boolean true', ->
      options = applyConfiguration.applyLoggingOptions({color: 'true'})
      assert.propertyVal(options, 'color', true)
    )
  )

  describe('with color option set to legacy \'false\' string value', ->
    it('resulting configuration should contain \'color\' set to boolean false', ->
      options = applyConfiguration.applyLoggingOptions({color: 'false'})
      assert.propertyVal(options, 'color', false)
    )
  )
)


describe('applyConfiguration()', ->
  loggerSettings = undefined
  config = undefined

  beforeEach( ->
    loggerSettings = clone(logger.transports.console)
  )
  afterEach( ->
    logger.transports.console = loggerSettings
  )

  it('applies logging options', ->
    config = applyConfiguration.applyConfiguration(
      options:
        color: 'true'
        level: 'debug'
    )

    assert.deepPropertyVal(config, 'options.color', true)
    assert.equal(logger.transports.console.colorize, true)

    assert.deepPropertyVal(config, 'options.level', 'debug')
    assert.equal(logger.transports.console.level, 'debug')
  )
)
