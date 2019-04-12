const R = require('ramda');
const { assert } = require('chai');
const { EventEmitter } = require('events');
const { DEFAULT_CONFIG, resolveConfig } = require('../../../lib/configuration/applyConfiguration');

describe('resolveConfig()', () => {
  const withOverrides = R.mergeDeepRight({
    server: 'http://127.0.0.1',
    options: {
      path: './foo.apib',
      custom: {
        apiaryApiKey: 'the-key',
        apiaryApiName: 'the-api-name',
      },
    },
  });
  const { config } = resolveConfig(withOverrides({}));

  describe('when flattening config', () => {
    it('removes nested "options" key', () => {
      assert.doesNotHaveAllKeys(config, 'options');
    });

    it('moves options on the rool level', () => {
      assert.containsAllKeys(config, ['path', 'custom']);
      assert.containsAllKeys(config.custom, ['apiaryApiKey', 'apiaryApiName']);
    });
  });

  describe('when merging with default options', () => {
    it('contains default options', () => {
      assert.hasAllKeys(config, Object.keys(DEFAULT_CONFIG).concat('emitter'));
    });

    it('overrides default options with custom ones', () => {
      assert.deepEqual(config.path, ['./foo.apib']);
    });

    describe('replaces "server" with "endpoint"', () => {
      it('removes "server" key', () => {
        assert.notProperty(config, 'server');
      });

      it('sets value to "endpoint" key', () => {
        assert.propertyVal(config, 'endpoint', 'http://127.0.0.1');
      });

      it('allows to set "options.server" command', () => {
        const { config: nextConfig } = resolveConfig(
          withOverrides({
            options: {
              server: 'npm start',
            },
          })
        );
        assert.propertyVal(nextConfig, 'server', 'npm start');
      });

      it('overrides "endpoint" with "options.endpoint"', () => {
        const { config: nextConfig } = resolveConfig(
          withOverrides({
            options: {
              endpoint: 'http://0.0.0.0',
            },
          })
        );
        assert.propertyVal(nextConfig, 'endpoint', 'http://0.0.0.0');
      });

      it('propagates both "options.endpoint" and "options.server" to root', () => {
        const { config: nextConfig } = resolveConfig(
          withOverrides({
            server: 'http://127.0.0.1',
            options: {
              endpoint: 'http://0.0.0.0',
              server: 'npm start',
            },
          })
        );
        assert.propertyVal(nextConfig, 'server', 'npm start');
        assert.propertyVal(nextConfig, 'endpoint', 'http://0.0.0.0');
      });
    });

    it('preserves "emitter" instance', () => {
      assert.instanceOf(config.emitter, EventEmitter);
    });

    describe('deep merges "custom" properties', () => {
      it('preserves default "cwd" property', () => {
        assert.equal(config.custom.cwd, DEFAULT_CONFIG.custom.cwd);
      });

      it('includes custom properties', () => {
        assert.equal(config.custom.apiaryApiKey, 'the-key');
        assert.equal(config.custom.apiaryApiName, 'the-api-name');
      });
    });
  });
});
