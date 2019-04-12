const { assert } = require('chai');
const { resolveConfig, _utils } = require('../../../lib/configuration/applyConfiguration');

describe('resolveConfig()', () => {
  const { config } = resolveConfig({
    options: {
      path: './foo.apib',
      custom: {
        apiaryApiKey: 'the-key',
        apiaryApiName: 'the-api-name',
      },
    },
  });

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
      assert.hasAllKeys(config, Object.keys(_utils.defaultConfig).concat('emitter'));
    });
    it('overrides default options with custom ones', () => {
      assert.deepEqual(config.path, ['./foo.apib']);
    });
    it('preserves "emitter" instance', () => {
      assert.isNotNull(config.emitter);
      assert.isNotNull(config.emitter.on);
      assert.typeOf(config.emitter.on, 'Function');
    });

    describe('deep merges "custom" properties', () => {
      it('preserves default "cwd" property', () => {
        assert.equal(config.custom.cwd, process.cwd());
      });
      it('includes custom properties', () => {
        assert.equal(config.custom.apiaryApiKey, 'the-key');
        assert.equal(config.custom.apiaryApiName, 'the-api-name');
      });
    });
  });
});
