const { assert } = require('chai');

const validateParams = require('../../../lib/compile-uri/validate-params');

describe('validateParams()', () => {
  it('should return an object', () => {
    const params = {
      name: {
        description: 'Machine name',
        type: 'string',
        required: true,
        example: 'waldo',
        default: '',
        values: []
      }
    };

    const result = validateParams(params);
    assert.isObject(result);
  });

  describe('when type is string and example is a parseable float', () =>
    it('should set no error', () => {
      const params = {
        name: {
          description: 'Machine name',
          type: 'string',
          required: true,
          example: '1.1',
          default: '',
          values: []
        }
      };

      const result = validateParams(params);
      assert.equal(result.errors.length, 0);
    })
  );

  describe('when type is number and example is zero', () =>
    it('should set no error', () => {
      const params = {
        name: {
          description: 'Machine name',
          type: 'number',
          required: true,
          example: 0,
          default: '',
          values: []
        }
      };

      const result = validateParams(params);
      assert.equal(result.errors.length, 0);
    })
  );

  // Based on bug report:
  // https://github.com/apiaryio/dredd/issues/106
  describe('when type is string and example is a string but starting with a number', () =>
    it('should set no error', () => {
      const params = {
        name: {
          description: 'Machine name',
          type: 'string',
          required: true,
          example: '6f7c1245',
          default: '',
          values: []
        }
      };

      validateParams(params);
    })
  );

  describe('when type is string and example is a not a parseable float', () =>
    it('should set no error', () => {
      const params = {
        name: {
          description: 'Machine name',
          type: 'string',
          required: true,
          example: 'waldo',
          default: '',
          values: []
        }
      };

      const result = validateParams(params);
      assert.equal(result.errors.length, 0);
    })
  );

  describe('when type is number and example is a string', () =>
    it('should set descriptive error', () => {
      const params = {
        name: {
          description: 'Machine name',
          type: 'number',
          required: true,
          example: 'waldo',
          default: '',
          values: []
        }
      };

      const result = validateParams(params);
      const message = result.errors[0];
      assert.include(message, 'name');
      assert.include(message, 'number');
    })
  );

  describe('when type is number and example is a parseable float', () =>
    it('should set no error', () => {
      const params = {
        name: {
          description: 'Machine name',
          type: 'number',
          required: true,
          example: '1.1',
          default: '',
          values: []
        }
      };

      const result = validateParams(params);
      assert.equal(result.errors.length, 0);
    })
  );

  describe('when enum values are defined and example value is not one of enum values', () =>
    it('should set descirptive error', () => {
      const params = {
        name: {
          description: 'Machine name',
          type: 'string',
          required: true,
          example: 'D',
          default: '',
          values: ['A', 'B', 'C']
        }
      };

      const result = validateParams(params);
      const message = result.errors[0];
      assert.include(message, 'name');
      assert.include(message, 'enum');
    })
  );

  describe('when enum values are defined and example value is one of enum values', () =>
    it('should set no errors', () => {
      const params = {
        name: {
          description: 'Machine name',
          type: 'string',
          required: true,
          example: 'A',
          default: '',
          values: ['A', 'B', 'C']
        }
      };

      const result = validateParams(params);
      assert.equal(result.errors.length, 0);
    })
  );

  describe('when type is boolean and example value is not parseable bool', () =>
    it('should set descirptive error', () => {
      const params = {
        name: {
          description: 'Machine name',
          type: 'boolean',
          required: true,
          example: 'booboo',
          default: '',
          values: []
        }
      };

      const result = validateParams(params);
      const message = result.errors[0];
      assert.include(message, 'name');
      assert.include(message, 'boolean');
    })
  );

  describe('when type is boolean and example value is a parseable bool', () =>
    it('should set no error', () => {
      const params = {
        name: {
          description: 'Machine name',
          type: 'boolean',
          required: true,
          example: 'true',
          default: '',
          values: []
        }
      };

      const result = validateParams(params);
      assert.equal(result.errors.length, 0);
    })
  );

  describe('when parameter is required', () => {
    describe('and example and default value are empty', () =>
      it('should set descirptive error', () => {
        const params = {
          name: {
            description: 'Machine name',
            type: 'string',
            required: true,
            example: '',
            default: '',
            values: []
          }
        };

        const result = validateParams(params);
        const message = result.errors[0];
        assert.include(message, 'name');
        assert.include(message, 'Required');
      })
    );

    describe('and default value is not empty and example value is empty', () =>
      it('should not set the error', () => {
        const params = {
          name: {
            description: 'Machine name',
            type: 'string',
            required: true,
            example: '',
            default: 'bagaboo',
            values: []
          }
        };

        const result = validateParams(params);
        assert.equal(result.errors.length, 0);
      })
    );

    describe('and example value is not empty and default value is empty', () =>
      it('should not set the error', () => {
        const params = {
          name: {
            description: 'Machine name',
            type: 'string',
            required: true,
            example: 'booboo',
            default: '',
            values: []
          }
        };

        const result = validateParams(params);
        assert.equal(result.errors.length, 0);
      })
    );
  });

  describe('when parameter is not required', () => {
    describe('and example and default value are empty', () =>
      it('should not set descirptive error', () => {
        const params = {
          name: {
            description: 'Machine name',
            type: 'string',
            required: false,
            example: '',
            default: '',
            values: []
          }
        };

        const result = validateParams(params);
        assert.equal(result.errors.length, 0);
      })
    );


    describe('and default value is not empty and example value is empty', () =>
      it('should not set the error', () => {
        const params = {
          name: {
            description: 'Machine name',
            type: 'string',
            required: true,
            example: '',
            default: 'bagaboo',
            values: []
          }
        };

        const result = validateParams(params);
        assert.equal(result.errors.length, 0);
      })
    );

    describe('and example value is not empty and default value is empty', () =>
      it('should not set the error', () => {
        const params = {
          name: {
            description: 'Machine name',
            type: 'string',
            required: true,
            example: 'booboo',
            default: '',
            values: []
          }
        };

        const result = validateParams(params);
        assert.equal(result.errors.length, 0);
      })
    );
  });
});
