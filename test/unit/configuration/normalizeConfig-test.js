const { assert } = require('chai');
const { _utils } = require('../../../lib/configuration/normalizeConfig');

describe('normalizeConfig()', () => {
  describe('removeUnsupportedOptions()', () => {
    describe('removes without coercion', () => {
      const result = _utils.removeUnsupportedOptions({
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
        assert.deepEqual(_utils.coerceToArray(null), []);
      });

      it('when given a string', () => {
        assert.deepEqual(_utils.coerceToArray('foo'), ['foo']);
      });

      it('when given an array', () => {
        assert.deepEqual(_utils.coerceToArray(['foo', 'bar']), ['foo', 'bar']);
      });
    });

    describe('coerceToBoolean', () => {
      it('when given a boolean', () => {
        assert.equal(_utils.coerceToBoolean(true), true);
        assert.equal(_utils.coerceToBoolean(false), false);
      });

      describe('when given a string', () => {
        it('that equals "true"', () => {
          assert.equal(_utils.coerceToBoolean('true'), true);
        });

        it('that equals "false"', () => {
          assert.equal(_utils.coerceToBoolean('false'), false);
        });

        it('that has a random value', () => {
          assert.equal(_utils.coerceToBoolean('foo'), true);
        });

        it('that is empty', () => {
          assert.equal(_utils.coerceToBoolean(''), false);
        });
      });
    });

    describe('c (color alias)', () => {
      const result = _utils.coerceColorOption({ c: false });

      it('coerces to boolean "color" option', () => {
        assert.propertyVal(result, 'color', false);
      });

      it('removes "c" option', () => {
        assert.notProperty(result, 'c');
      });
    });

    describe('apiDescriptions', () => {
      describe('when given a string', () => {
        const result = _utils.coerceApiDescriptions('foo');

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
        const result = _utils.coerceApiDescriptions(['foo', 'bar']);

        it('coerces into list of descriptions', () => {
          assert.deepEqual(result, [
            { location: 'configuration.apiDescriptions[0]', content: 'foo' },
            { location: 'configuration.apiDescriptions[1]', content: 'bar' },
          ]);
        });
      });
    });

    describe('user', () => {
      const result = _utils.coerceUserOption({ user: 'apiary' });

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
          assert.propertyVal(_utils.coerceDeprecatedLevelOption({ l: 'silly' }), 'loglevel', 'debug');
        });

        it('when given "verbose"', () => {
          assert.propertyVal(_utils.coerceDeprecatedLevelOption({ l: 'verbose' }), 'loglevel', 'debug');
        });

        it('when given "debug"', () => {
          assert.propertyVal(_utils.coerceDeprecatedLevelOption({ l: 'debug' }), 'loglevel', 'debug');
        });
      });

      describe('coerces to "error"', () => {
        it('when given "error"', () => {
          assert.propertyVal(_utils.coerceDeprecatedLevelOption({ l: 'error' }), 'loglevel', 'error');
        });
      });

      describe('coerces to "silent"', () => {
        it('when given "silent"', () => {
          assert.propertyVal(_utils.coerceDeprecatedLevelOption({ l: 'silent' }), 'loglevel', 'silent');
        });
      });

      describe('coerces to "warn"', () => {
        it('in all other cases', () => {
          assert.propertyVal(_utils.coerceDeprecatedLevelOption({ l: null }), 'loglevel', 'warn');
          assert.propertyVal(_utils.coerceDeprecatedLevelOption({ l: null }), 'loglevel', 'warn');
        });
      });
    });

    describe('data', () => {
      describe('coerces to "apiDescriptions"', () => {
        it('when given { filename: apiDescription } format', () => {
          const result = _utils.coerceDeprecatedDataOption({
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
          const result = _utils.coerceDeprecatedDataOption({
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
          const result = _utils.coerceDeprecatedDataOption({
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
  });
});
