import { assert } from 'chai'
import { EventEmitter } from 'events'
import {
  DEFAULT_CONFIG,
  resolveConfig
} from '../../../lib/configuration/applyConfiguration'

describe('resolveConfig()', () => {
  describe('when flattening config', () => {
    const { config } = resolveConfig({
      options: {
        path: './foo.apib',
        custom: {
          apiaryApiKey: 'the-key',
          apiaryApiName: 'the-api-name'
        }
      }
    })

    it('removes nested "options" key', () => {
      assert.doesNotHaveAllKeys(config, 'options')
    })

    it('moves options on the rool level', () => {
      assert.containsAllKeys(config, ['path', 'custom'])
      assert.containsAllKeys(config.custom, ['apiaryApiKey', 'apiaryApiName'])
    })
  })

  describe('when merging with default options', () => {
    const { config } = resolveConfig({
      server: 'http://127.0.0.1',
      options: {
        path: './foo.apib',
        custom: {
          apiaryApiKey: 'the-key',
          apiaryApiName: 'the-api-name'
        }
      }
    })

    it('contains default options', () => {
      assert.hasAllKeys(config, Object.keys(DEFAULT_CONFIG).concat('emitter'))
    })

    it('overrides default options with custom ones', () => {
      assert.deepEqual(config.path, ['./foo.apib'])
    })

    describe('deep merges "custom" properties', () => {
      it('preserves default "cwd" property', () => {
        assert.equal(config.custom.cwd, DEFAULT_CONFIG.custom.cwd)
      })

      it('includes custom properties', () => {
        assert.equal(config.custom.apiaryApiKey, 'the-key')
        assert.equal(config.custom.apiaryApiName, 'the-api-name')
      })
    })
  })

  // Options
  describe('option: server', () => {
    describe('when no "server" set', () => {
      const { config: nextConfig } = resolveConfig({
        path: []
      })

      it('has default "endpoint" option value', () => {
        assert.propertyVal(nextConfig, 'endpoint', DEFAULT_CONFIG.endpoint)
      })

      it('has no "server" option', () => {
        assert.notProperty(nextConfig, 'server')
      })
    })

    describe('when "server" set', () => {
      const { config: nextConfig } = resolveConfig({
        server: 'http://127.0.0.1'
      })

      it('sets "endpoint" based on "server" value', () => {
        assert.propertyVal(nextConfig, 'endpoint', 'http://127.0.0.1')
      })
      it('removes deprecated "server" root option', () => {
        assert.notProperty(nextConfig, 'server')
      })
    })

    describe('when both "server" and "options.endpoint" set', () => {
      const { config } = resolveConfig({
        server: 'http://127.0.0.1',
        options: {
          endpoint: 'https://apiary.io'
        }
      })

      it('treats "options.endpoint" as higher priority', () => {
        assert.propertyVal(config, 'endpoint', 'https://apiary.io')
      })
      it('removes deprecated "server" root option', () => {
        assert.notProperty(config, 'server')
      })
    })

    describe('when "options.server" is set', () => {
      const { config: nextConfig } = resolveConfig({
        options: {
          server: 'npm start'
        }
      })

      it('coerces to "server" root options', () => {
        assert.propertyVal(nextConfig, 'server', 'npm start')
      })
    })

    describe('when both root "server" and "options.server" set', () => {
      const { config } = resolveConfig({
        server: 'http://127.0.0.1',
        options: {
          server: 'npm start'
        }
      })

      it('coerces root "server" to "endpoint"', () => {
        assert.propertyVal(config, 'endpoint', 'http://127.0.0.1')
      })
      it('coerces "options.server" to root "server"', () => {
        assert.propertyVal(config, 'server', 'npm start')
      })
    })

    describe('when root "server", "options.endpoint" and "options.server" set', () => {
      const { config } = resolveConfig({
        server: 'http://127.0.0.1',
        options: {
          server: 'npm start',
          endpoint: 'https://apiary.io'
        }
      })

      it('coerces "options.server" to root "server" option', () => {
        assert.propertyVal(config, 'server', 'npm start')
      })
      it('takes "options.endpoint" as a priority over root "server"', () => {
        assert.propertyVal(config, 'endpoint', 'https://apiary.io')
      })
    })
  })

  //

  describe('option: emitter', () => {
    describe('with default configuration', () => {
      const { config } = resolveConfig({})

      it('has default emitter', () => {
        assert.instanceOf(config.emitter, EventEmitter)
      })
    })

    describe('when provided custom emitter', () => {
      let emitterCalled = false
      const customEmitter = new EventEmitter()
      customEmitter.addListener('test', () => {
        emitterCalled = true
      })

      const { config } = resolveConfig({
        emitter: customEmitter
      })

      it('uses custom event emitter', () => {
        config.emitter.emit('test')
        assert.isTrue(emitterCalled)
      })
    })
  })
})
