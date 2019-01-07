const { assert } = require('chai');

const fury = require('fury');

const compileParams = require('../../../lib/compile-uri/compile-params');

describe('compileParams()', () => {
  it('should compile a primitive href variable', () => {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    hrefVariables.set('name', new fury.minim.elements.String());

    const parameters = compileParams(hrefVariables);

    assert.deepEqual(parameters, {
      name: {
        default: undefined,
        example: undefined,
        required: false,
        values: []
      }
    });
  });

  it('should compile a required href variable', () => {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    hrefVariables.set('name', 'Doe');
    hrefVariables.getMember('name').attributes.set('typeAttributes', ['required']);

    const parameters = compileParams(hrefVariables);

    assert.deepEqual(parameters, {
      name: {
        default: undefined,
        example: 'Doe',
        required: true,
        values: []
      }
    });
  });

  it('should compile a primitive href variable with value', () => {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    hrefVariables.set('name', 'Doe');

    const parameters = compileParams(hrefVariables);

    assert.deepEqual(parameters, {
      name: {
        default: undefined,
        example: 'Doe',
        required: false,
        values: []
      }
    });
  });

  it('should compile a primitive href variable with default', () => {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    hrefVariables.set('name', new fury.minim.elements.String());
    hrefVariables.get('name').attributes.set('default', 'Unknown');

    const parameters = compileParams(hrefVariables);

    assert.deepEqual(parameters, {
      name: {
        default: 'Unknown',
        example: undefined,
        required: false,
        values: []
      }
    });
  });

  it('should compile a primitive example variable which its value is 0', () => {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    hrefVariables.set('example', 0);

    const parameters = compileParams(hrefVariables);

    assert.deepEqual(parameters, {
      example: {
        default: undefined,
        example: 0,
        required: false,
        values: []
      }
    });
  });

  it('should compile an array href variable', () => {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    hrefVariables.set('names', []);

    const parameters = compileParams(hrefVariables);

    assert.deepEqual(parameters, {
      names: {
        default: undefined,
        example: [],
        required: false,
        values: []
      }
    });
  });

  it('should compile an array href variable with values', () => {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    hrefVariables.set('names', ['One', 'Two']);

    const parameters = compileParams(hrefVariables);

    assert.deepEqual(parameters, {
      names: {
        default: undefined,
        example: ['One', 'Two'],
        required: false,
        values: []
      }
    });
  });

  it('should compile an array href variable with default', () => {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    hrefVariables.set('names', []);
    hrefVariables.get('names').attributes.set('default', ['Unknown']);

    const parameters = compileParams(hrefVariables);

    assert.deepEqual(parameters, {
      names: {
        default: ['Unknown'],
        example: [],
        required: false,
        values: []
      }
    });
  });

  it('should compile an array href variable with values', () => {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    hrefVariables.set('names', ['One', 'Two']);

    const parameters = compileParams(hrefVariables);

    assert.deepEqual(parameters, {
      names: {
        default: undefined,
        example: ['One', 'Two'],
        required: false,
        values: []
      }
    });
  });

  it('should compile an array href variable with default', () => {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    hrefVariables.set('names', []);
    hrefVariables.get('names').attributes.set('default', ['Unknown']);

    const parameters = compileParams(hrefVariables);

    assert.deepEqual(parameters, {
      names: {
        default: ['Unknown'],
        example: [],
        required: false,
        values: []
      }
    });
  });

  it('should compile an enum href variable', () => {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    const value = new fury.minim.elements.Enum();
    value.enumerations = ['ascending', 'decending'];
    hrefVariables.set('order', value);

    const parameters = compileParams(hrefVariables);

    assert.deepEqual(parameters, {
      order: {
        default: undefined,
        example: 'ascending',
        required: false,
        values: ['ascending', 'decending']
      }
    });
  });

  it('should compile an enum href variable with values', () => {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    const value = new fury.minim.elements.Enum('decending');
    value.enumerations = ['ascending', 'decending'];
    hrefVariables.set('order', value);

    const parameters = compileParams(hrefVariables);

    assert.deepEqual(parameters, {
      order: {
        default: undefined,
        example: 'decending',
        required: false,
        values: ['ascending', 'decending']
      }
    });
  });

  it('should compile an enum href variable with default', () => {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    const value = new fury.minim.elements.Enum();
    value.enumerations = ['ascending', 'decending'];
    value.attributes.set('default', new fury.minim.elements.Enum('decending'));
    hrefVariables.set('order', value);

    const parameters = compileParams(hrefVariables);

    assert.deepEqual(parameters, {
      order: {
        default: 'decending',
        example: 'ascending',
        required: false,
        values: ['ascending', 'decending']
      }
    });
  });
});
