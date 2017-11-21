const {assert} = require('chai');

const expandUriTemplate = require('../../../src/compile-uri/expand-uri-template');

describe('expandUriTemplate', function() {
  let data = null;
  let uriTemplate = '';
  let parameters = '';

  before(function() {
    uriTemplate = '/machines{/name}';
    parameters = {
      name: {
        description: 'Machine name',
        type: 'string',
        required: true,
        example: 'waldo',
        default: ''
      }
    };

    return data = expandUriTemplate(uriTemplate, parameters);
  });

  it('should return an object', () => assert.isObject(data));

  return describe('returned obejct', function() {
    [
      'errors',
      'warnings',
      'uri'
    ].forEach(key =>
      it(`should have key "${key}"`, () => assert.include(Object.keys(data), key))
    );

    describe('when not parseable uri templeate privided', function() {
      before(function() {
        uriTemplate = '/machines{{/name}';
        parameters = {
          name: {
            description: 'Machine name',
            type: 'string',
            required: true,
            example: 'waldo',
            default: ''
          }
        };

        return data = expandUriTemplate(uriTemplate, parameters);
      });

      return it('it should return some errror', () => assert.notEqual(data['errors'].length, 0));
    });


    describe('when URI with no URI template expression given', function() {
      before(function() {
        uriTemplate = '/machines/waldo';
        parameters = {};
        return data = expandUriTemplate(uriTemplate, parameters);
      });

      describe('with no parameters given', function() {
        it('should return no error', () => assert.equal(data['errors'].length, 0));

        it('should return no warning', () => assert.equal(data['warnings'].length, 0));

        return it('should return URI as it is', () => assert.equal(data['uri'], uriTemplate));
      });


      return describe('with some parameters given', function() {
        before(function() {
          uriTemplate = '/machines/waldo';
          parameters = {
            name: {
              description: 'Machine name',
              type: 'string',
              required: true,
              example: 'waldo',
              default: ''
            }
          };

          return data = expandUriTemplate(uriTemplate, parameters);
        });

        it('should return no error', () => assert.equal(data['errors'].length, 0));

        it('should return no warning', () =>
          // The warning was removed as parser started to provide its own
          // warning for the very same thing.
          assert.equal(data['warnings'].length, 0)
        );

        return it('should return URI as it is', () => assert.equal(data['uri'], uriTemplate));
      });
    });


    return describe('when UriTemplate with some URI template expression given', function() {
      describe('when no matching parameters provided', function() {
        before(function() {
          uriTemplate = '/machines/{name}';
          parameters = {};
          return data = expandUriTemplate(uriTemplate, parameters);
        });

        it('should return some warning', () => assert.notEqual(data['warnings'].length, 0));

        describe('returned warning', function() {
          let warning = '';
          before(() => warning = data['warnings'][data['warnings'].length - 1]);

          return it('should contain proper text', function() {
            const text =  "Parameter not defined";
            return assert.include(warning, text);
          });
        });

        it('should return no error', () => assert.equal(data['errors'].length, 0));

        return it('should return no URI', () => assert.equal(data['uri'], null));
      });

      describe('with defined some parameters not matching any expression', function() {
        before(function() {
          uriTemplate = '/machines/{name}';
          parameters = {
            name: {
              description: 'Machine name',
              type: 'string',
              required: true,
              example: 'waldo',
              default: ''
            },
            fanny: {
              required: false,
              description: 'Machine fanny',
              type: 'string',
              required: true,
              example: 'wild',
              default: ''
            }
          };

          return data = expandUriTemplate(uriTemplate, parameters);
        });

        it('should return no error', () => assert.equal(data['errors'].length, 0));

        it('should return no warning', () =>
          // The warning was removed as parser started to provide its own
          // warning for the very same thing.
          assert.equal(data['warnings'].length, 0)
        );

        return it('should return expandend URI', () => assert.equal(data['uri'], '/machines/waldo'));
      });

      describe('when expression parameter is required', function() {
        describe('when example is not given', function() {
          before(function() {
            uriTemplate = '/machines/{name}';
            parameters = {
              name: {
                description: 'Machine name',
                type: 'string',
                required: true,
                example: '',
                default: ''
              }
            };

            return data = expandUriTemplate(uriTemplate, parameters);
          });

          it('should return no error', () => assert.equal(data['errors'].length, 0));

          it('should return some warning', () => assert.equal(data['warnings'].length, 1));

          it('should return no URI', () => assert.isNull(data['uri']));

          return describe('returned warning', function() {
            let warning = '';
            before(() => warning = data['warnings'][data['warnings'].length - 1]);

            return it('should contain proper text', function() {
              const text = "No example value for required parameter";
              return assert.include(warning, text);
            });
          });
        });

        describe('when example value is given', function() {
          before(function() {
            uriTemplate = '/machines/{name}';
            parameters = {
              name: {
                description: 'Machine name',
                type: 'string',
                required: true,
                example: 'example-one',
                default: ''
              }
            };

            return data = expandUriTemplate(uriTemplate, parameters);
          });

          it('should return no error', () => assert.equal(data['errors'].length, 0));

          it('should return no warning', () => assert.equal(data['warnings'].length, 0));

          it('should use example value to URI parameter expansion', () => assert.include(data['uri'], parameters['name']['example']));

          return it('should return URI', () => assert.isNotNull(data['uri']));
      });

        describe('when default value is given', function() {
          before(function() {
            uriTemplate = '/machines/{name}';
            parameters = {
              name: {
                description: 'Machine name',
                type: 'string',
                required: true,
                example: '',
                default: 'example-one'
              }
            };

            return data = expandUriTemplate(uriTemplate, parameters);
          });

          it('should return no error', () => assert.equal(data['errors'].length, 0));

          it('should return one warning', () => assert.equal(data['warnings'].length, 1));

          it('should return warning about pointlessness of default value of a required parameter', () => assert.include(data.warnings[0], 'Default value for a required parameter'));

          it('should use default value to URI parameter expansion', () => assert.include(data['uri'], parameters['name']['default']));

          return it('should return URI', () => assert.isNotNull(data['uri']));
      });

        return describe('when example and default values are given', function() {
          before(function() {
            uriTemplate = '/machines/{name}';
            parameters = {
              name: {
                description: 'Machine name',
                type: 'string',
                required: true,
                example: 'example-one',
                default: 'default-one'
              }
            };

            return data = expandUriTemplate(uriTemplate, parameters);
          });

          it('should return no error', () => assert.equal(data['errors'].length, 0));

          it('should return one warning', () => assert.equal(data['warnings'].length, 1));

          it('should return warning about pointlessness of default value of a required parameter', () => assert.include(data.warnings[0], 'Default value for a required parameter'));

          it('should use example value to URI parameter expansion', () => assert.include(data['uri'], parameters['name']['example']));

          return it('should return URI', () => assert.isNotNull(data['uri']));
      });
    });

      return describe('when expression parameter is optional', function() {
        before(function() {
          uriTemplate = '/machines/{name}';
          parameters = {
            name: {
              description: 'Machine name',
              type: 'string',
              required: false,
              example: 'example-one',
              default: ''
            }
          };

          return data = expandUriTemplate(uriTemplate, parameters);
        });

        it('should return no error', () => assert.equal(data['errors'].length, 0));

        it('should return no warning', () => assert.equal(data['warnings'].length, 0));

        it('should use example value to URI parameter expansion', () => assert.include(data['uri'], parameters['name']['example']));

        it('should return URI', () => assert.isNotNull(data['uri']));

        describe('when default value is given and example is empty', function() {
          before(function() {
            uriTemplate = '/machines/{name}';
            parameters = {
              name: {
                description: 'Machine name',
                type: 'string',
                required: false,
                default: 'default-one',
                example: ''
              }
            };

            return data = expandUriTemplate(uriTemplate, parameters);
          });

          it('should return no error', () => assert.equal(data['errors'].length, 0));

          it('should return no warning', () => assert.equal(data['warnings'].length, 0));

          it('should use default value to URI parameter expansion', () => assert.include(data['uri'], parameters['name']['default']));

          return it('should return URI', () => assert.isNotNull(data['uri']));
      });

        describe('when example and default values are given', function() {
          before(function() {
            uriTemplate = '/machines/{name}';
            parameters = {
              name: {
                description: 'Machine name',
                type: 'string',
                required: false,
                example: 'example-one',
                default: 'default-one'
              }
            };

            return data = expandUriTemplate(uriTemplate, parameters);
          });

          it('should return no error', () => assert.equal(data['errors'].length, 0));

          it('should return no warning', () => assert.equal(data['warnings'].length, 0));

          it('should use example value to URI parameter expansion', () => assert.include(data['uri'], parameters['name']['example']));

          return it('should return some URI', () => assert.isNotNull(data['uri']));
      });

        return describe('when example and default values are not given', function() {
          before(function() {
            uriTemplate = '/machines/{name}';
            parameters = {
              name: {
                description: 'Machine name',
                type: 'string',
                required: false,
                default: '',
                example: ''
              }
            };

            return data = expandUriTemplate(uriTemplate, parameters);
          });

          it('should return no error', () => assert.equal(data['errors'].length, 0));

          it('should return no warning', () => assert.equal(data['warnings'].length, 0));

          return it('should return some URI', () => assert.isNotNull(data['uri']));
      });
    });
  });
});
});
