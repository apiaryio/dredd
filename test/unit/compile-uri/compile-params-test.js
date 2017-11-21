const {assert} = require('chai');
const fury = new require('fury');

const compileParams = require('../../../src/compile-uri/compile-params');

describe('compileParams', function() {
  it('should compile a primitive href variable', function() {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    hrefVariables.set('name', new fury.minim.elements.String());

    const parameters = compileParams(hrefVariables);

    return assert.deepEqual(parameters, {
      name: {
        default: undefined,
        example: undefined,
        required: false,
        values: []
      }
    });
  });

  it('should compile a required href variable', function() {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    hrefVariables.set('name', 'Doe');
    hrefVariables.getMember('name').attributes.set('typeAttributes', ['required']);

    const parameters = compileParams(hrefVariables);

    return assert.deepEqual(parameters, {
      name: {
        default: undefined,
        example: 'Doe',
        required: true,
        values: []
      }
    });
  });

  it('should compile a primitive href variable with value', function() {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    hrefVariables.set('name', 'Doe');

    const parameters = compileParams(hrefVariables);

    return assert.deepEqual(parameters, {
      name: {
        default: undefined,
        example: 'Doe',
        required: false,
        values: []
      }
    });
  });

  it('should compile a primitive href variable with default', function() {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    hrefVariables.set('name', new fury.minim.elements.String());
    hrefVariables.get('name').attributes.set('default', 'Unknown');

    const parameters = compileParams(hrefVariables);

    return assert.deepEqual(parameters, {
      name: {
        default: 'Unknown',
        example: undefined,
        required: false,
        values: []
      }
    });
  });

  it('should compile an array href variable', function() {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    hrefVariables.set('names', []);

    const parameters = compileParams(hrefVariables);

    return assert.deepEqual(parameters, {
      names: {
        default: undefined,
        example: [],
        required: false,
        values: []
      }
    });
  });

  it('should compile an array href variable with values', function() {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    hrefVariables.set('names', ['One', 'Two']);

    const parameters = compileParams(hrefVariables);

    return assert.deepEqual(parameters, {
      names: {
        default: undefined,
        example: ['One', 'Two'],
        required: false,
        values: []
      }
    });
  });

  it('should compile an array href variable with default', function() {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    hrefVariables.set('names', []);
    hrefVariables.get('names').attributes.set('default', ['Unknown']);

    const parameters = compileParams(hrefVariables);

    return assert.deepEqual(parameters, {
      names: {
        default: ['Unknown'],
        example: [],
        required: false,
        values: []
      }
    });
  });

  it('should compile an array href variable with values', function() {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    hrefVariables.set('names', ['One', 'Two']);

    const parameters = compileParams(hrefVariables);

    return assert.deepEqual(parameters, {
      names: {
        default: undefined,
        example: ['One', 'Two'],
        required: false,
        values: []
      }
    });
  });

  it('should compile an array href variable with default', function() {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    hrefVariables.set('names', []);
    hrefVariables.get('names').attributes.set('default', ['Unknown']);

    const parameters = compileParams(hrefVariables);

    return assert.deepEqual(parameters, {
      names: {
        default: ['Unknown'],
        example: [],
        required: false,
        values: []
      }
    });
  });

  it('should compile an enum href variable', function() {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    const value = new fury.minim.elements.Element();
    value.element = 'enum';
    value.attributes.set('enumerations', ['ascending', 'decending']);
    hrefVariables.set('order', value);

    const parameters = compileParams(hrefVariables);

    return assert.deepEqual(parameters, {
      order: {
        default: undefined,
        example: 'ascending',
        required: false,
        values: ['ascending', 'decending']
      }
    });
  });

  it('should compile an enum href variable with values', function() {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    const value = new fury.minim.elements.Element('decending');
    value.element = 'enum';
    value.attributes.set('enumerations', ['ascending', 'decending']);
    hrefVariables.set('order', value);

    const parameters = compileParams(hrefVariables);

    return assert.deepEqual(parameters, {
      order: {
        default: undefined,
        example: 'decending',
        required: false,
        values: ['ascending', 'decending']
      }
    });
  });

  return it('should compile an enum href variable with default', function() {
    const hrefVariables = new fury.minim.elements.HrefVariables();
    const value = new fury.minim.elements.Element();
    value.element = 'enum';
    value.attributes.set('enumerations', ['ascending', 'decending']);
    value.attributes.set('default', 'decending');
    hrefVariables.set('order', value);

    const parameters = compileParams(hrefVariables);

    return assert.deepEqual(parameters, {
      order: {
        default: 'decending',
        example: 'ascending',
        required: false,
        values: ['ascending', 'decending']
      }
    });
  });
});
