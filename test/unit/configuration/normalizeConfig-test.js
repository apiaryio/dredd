const { assert } = require('chai');
const {
  coerceToArray,
  coerceToBoolean,
  removeUnsupportedOptions,
  coerceColorOption,
  coerceApiDescriptions,
  coerceDeprecatedDataOption,
  coerceDeprecatedLevelOption,
  coerceDeprecatedHooksHandlerOptions,
  coerceUserOption,
} = require('../../../lib/configuration/normalizeConfig');

describe('normalizeConfig()', () => {
  describe('removeUnsupportedOptions()', () => {
    describe('removes without coercion', () => {
      const result = removeUnsupportedOptions({
        q: true,
        silent: true,
        t: true,
        timestamp: true,
        blueprintPath: './foo.apib',
        b: true,
        sandbox: true,
      });

      ['q', 'silent', 't', 'timestamp', 'blueprintPath', 'b', 'sandbox'].forEach((optionName) => {
        it(`removes "${optionName}"`, () => {
          assert.notProperty(result, optionName);
        });
      });
    });
  });

  describe('coercion', () => {
    describe('coerceToArray', () => {
      it('when given null', () => {
        assert.deepEqual(coerceToArray(null), []);
      });

      it('when given a string', () => {
        assert.deepEqual(coerceToArray('foo'), ['foo']);
      });

      it('when given an array', () => {
        assert.deepEqual(coerceToArray(['foo', 'bar']), ['foo', 'bar']);
      });
    });

    describe('coerceToBoolean', () => {
      it('when given a boolean', () => {
        assert.equal(coerceToBoolean(true), true);
        assert.equal(coerceToBoolean(false), false);
      });

      describe('when given a string', () => {
        it('that equals "true"', () => {
          assert.equal(coerceToBoolean('true'), true);
        });

        it('that equals "false"', () => {
          assert.equal(coerceToBoolean('false'), false);
        });

        it('that has a random value', () => {
          assert.equal(coerceToBoolean('foo'), true);
        });

        it('that is empty', () => {
          assert.equal(coerceToBoolean(''), false);
        });
      });
    });

    describe('c (color alias)', () => {
      const result = coerceColorOption({ c: false });

      it('coerces to boolean "color" option', () => {
        assert.propertyVal(result, 'color', false);
      });

      it('removes "c" option', () => {
        assert.notProperty(result, 'c');
      });
    });

    describe('apiDescriptions', () => {
      describe('when given a string', () => {
        const result = coerceApiDescriptions('foo');

        it('coerces into list of descriptions', () => {
          assert.deepEqual(result, [
            {
              location: 'configuration.apiDescriptions[0]',
              content: 'foo',
            },
          ]);
        });
      });

      describe('when given a list', () => {
        const result = coerceApiDescriptions(['foo', 'bar']);

        it('coerces into list of descriptions', () => {
          assert.deepEqual(result, [
            { location: 'configuration.apiDescriptions[0]', content: 'foo' },
            { location: 'configuration.apiDescriptions[1]', content: 'bar' },
          ]);
        });
      });
    });

    describe('user', () => {
      const result = coerceUserOption({ user: 'apiary' });

      it('coerces to base64 encoded "header"', () => {
        assert.deepEqual(result.header, ['Authorization: Basic YXBpYXJ5']);
      });

      it('removes "user" option', () => {
        assert.notProperty(result, 'user');
      });
    });
  });

  describe('coercion of deprecated options', () => {
    describe('level', () => {
      describe('coerces to "debug"', () => {
        it('when given "silly"', () => {
          assert.propertyVal(coerceDeprecatedLevelOption({ l: 'silly' }), 'loglevel', 'debug');
        });

        it('when given "verbose"', () => {
          assert.propertyVal(coerceDeprecatedLevelOption({ l: 'verbose' }), 'loglevel', 'debug');
        });

        it('when given "debug"', () => {
          assert.propertyVal(coerceDeprecatedLevelOption({ l: 'debug' }), 'loglevel', 'debug');
        });
      });

      describe('coerces to "error"', () => {
        it('when given "error"', () => {
          assert.propertyVal(coerceDeprecatedLevelOption({ l: 'error' }), 'loglevel', 'error');
        });
      });

      describe('coerces to "silent"', () => {
        it('when given "silent"', () => {
          assert.propertyVal(coerceDeprecatedLevelOption({ l: 'silent' }), 'loglevel', 'silent');
        });
      });

      describe('coerces to "warn"', () => {
        it('when given falsy value', () => {
          assert.propertyVal(coerceDeprecatedLevelOption({ l: 'warn' }), 'loglevel', 'warn');
          assert.propertyVal(coerceDeprecatedLevelOption({ l: 'foobar' }), 'loglevel', 'warn');
          assert.propertyVal(coerceDeprecatedLevelOption({ l: false }), 'loglevel', 'warn');
          assert.propertyVal(coerceDeprecatedLevelOption({ l: undefined }), 'loglevel', 'warn');
          assert.propertyVal(coerceDeprecatedLevelOption({ l: null }), 'loglevel', 'warn');
        });
      });
    });

    describe('data', () => {
      describe('coerces to "apiDescriptions"', () => {
        it('when given { filename: apiDescription } format', () => {
          const result = coerceDeprecatedDataOption({
            data: {
              'filename.api': 'FORMAT: 1A\n# Sample API\n',
            },
          });

          assert.deepEqual(result, {
            apiDescriptions: [
              {
                location: 'filename.api',
                content: 'FORMAT: 1A\n# Sample API\n',
              },
            ],
          });
        });

        it('when given { filename, raw: apiDescription } format', () => {
          const result = coerceDeprecatedDataOption({
            data: {
              'filename.api': {
                raw: 'FORMAT: 1A\n# Sample API\n',
                filename: 'filename.api',
              },
            },
          });

          assert.deepEqual(result, {
            apiDescriptions: [
              {
                location: 'filename.api',
                content: 'FORMAT: 1A\n# Sample API\n',
              },
            ],
          });
        });

        it('with both "data" and "apiDescriptions"', () => {
          const result = coerceDeprecatedDataOption({
            data: { 'filename.api': 'FORMAT: 1A\n# Sample API v2\n' },
            apiDescriptions: [
              {
                location: 'configuration.apiDescriptions[0]',
                content: 'FORMAT: 1A\n# Sample API v1\n',
              },
            ],
          });

          assert.deepEqual(result, {
            apiDescriptions: [
              {
                location: 'configuration.apiDescriptions[0]',
                content: 'FORMAT: 1A\n# Sample API v1\n',
              },
              {
                location: 'filename.api',
                content: 'FORMAT: 1A\n# Sample API v2\n',
              },
            ],
          });
        });
      });
    });

    describe('hooks-worker-*', () => {
      describe('coerces "hooks-worker-handler-*" to "hooks-handler-*"', () => {
        it('when given { hooks-worker-handler-host: foo } format', () => {
          const result = coerceDeprecatedHooksHandlerOptions({
            'hooks-worker-handler-host': 'foo',
          });

          assert.deepEqual(result, { 'hooks-handler-host': 'foo' });
        });

        it('when given { hooks-worker-handler-port: 1234 } format', () => {
          const result = coerceDeprecatedHooksHandlerOptions({
            'hooks-worker-handler-port': 1234,
          });

          assert.deepEqual(result, { 'hooks-handler-port': 1234 });
        });
      });

      describe('coerces "hooks-worker-*" to "hooks-handler-*"', () => {
        it('when given { hooks-worker-timeout: 1234 } format', () => {
          const result = coerceDeprecatedHooksHandlerOptions({
            'hooks-worker-timeout': 1234,
          });

          assert.deepEqual(result, { 'hooks-handler-timeout': 1234 });
        });

        it('when given { hooks-worker-connect-timeout: 1234 } format', () => {
          const result = coerceDeprecatedHooksHandlerOptions({
            'hooks-worker-connect-timeout': 1234,
          });

          assert.deepEqual(result, { 'hooks-handler-connect-timeout': 1234 });
        });

        it('when given { hooks-worker-connect-retry: 1234 } format', () => {
          const result = coerceDeprecatedHooksHandlerOptions({
            'hooks-worker-connect-retry': 1234,
          });

          assert.deepEqual(result, { 'hooks-handler-connect-retry': 1234 });
        });

        it('when given { hooks-worker-after-connect-wait: 1234 } format', () => {
          const result = coerceDeprecatedHooksHandlerOptions({
            'hooks-worker-after-connect-wait': 1234,
          });

          assert.deepEqual(result, { 'hooks-handler-after-connect-wait': 1234 });
        });

        it('when given { hooks-worker-term-timeout: 1234 } format', () => {
          const result = coerceDeprecatedHooksHandlerOptions({
            'hooks-worker-term-timeout': 1234,
          });

          assert.deepEqual(result, { 'hooks-handler-term-timeout': 1234 });
        });

        it('when given { hooks-worker-term-retry: 1234 } format', () => {
          const result = coerceDeprecatedHooksHandlerOptions({
            'hooks-worker-term-retry': 1234,
          });

          assert.deepEqual(result, { 'hooks-handler-term-retry': 1234 });
        });
      });
    });
  });
});
