{assert} = require 'chai'
fury = new require 'fury'

compileParams = require '../../../src/compile-uri/compile-params'

describe 'compileParams', ->
  it 'should compile a primitive href variable', ->
    hrefVariables = new fury.minim.elements.HrefVariables()
    hrefVariables.set('name', new fury.minim.elements.String())

    parameters = compileParams(hrefVariables)

    assert.deepEqual(parameters, {
      name: {
        default: undefined,
        example: undefined,
        required: false,
        values: []
      }
    })

  it 'should compile a required href variable', ->
    hrefVariables = new fury.minim.elements.HrefVariables()
    hrefVariables.set('name', 'Doe')
    hrefVariables.getMember('name').attributes.set('typeAttributes', ['required'])

    parameters = compileParams(hrefVariables)

    assert.deepEqual(parameters, {
      name: {
        default: undefined,
        example: 'Doe',
        required: true,
        values: []
      }
    })

  it 'should compile a primitive href variable with value', ->
    hrefVariables = new fury.minim.elements.HrefVariables()
    hrefVariables.set('name', 'Doe')

    parameters = compileParams(hrefVariables)

    assert.deepEqual(parameters, {
      name: {
        default: undefined,
        example: 'Doe',
        required: false,
        values: []
      }
    })

  it 'should compile a primitive href variable with default', ->
    hrefVariables = new fury.minim.elements.HrefVariables()
    hrefVariables.set('name', new fury.minim.elements.String())
    hrefVariables.get('name').attributes.set('default', 'Unknown')

    parameters = compileParams(hrefVariables)

    assert.deepEqual(parameters, {
      name: {
        default: 'Unknown',
        example: undefined,
        required: false,
        values: []
      }
    })

  it 'should compile an array href variable', ->
    hrefVariables = new fury.minim.elements.HrefVariables()
    hrefVariables.set('names', [])

    parameters = compileParams(hrefVariables)

    assert.deepEqual(parameters, {
      names: {
        default: undefined,
        example: [],
        required: false,
        values: []
      }
    })

  it 'should compile an array href variable with values', ->
    hrefVariables = new fury.minim.elements.HrefVariables()
    hrefVariables.set('names', ['One', 'Two'])

    parameters = compileParams(hrefVariables)

    assert.deepEqual(parameters, {
      names: {
        default: undefined,
        example: ['One', 'Two'],
        required: false,
        values: []
      }
    })

  it 'should compile an array href variable with default', ->
    hrefVariables = new fury.minim.elements.HrefVariables()
    hrefVariables.set('names', [])
    hrefVariables.get('names').attributes.set('default', ['Unknown'])

    parameters = compileParams(hrefVariables)

    assert.deepEqual(parameters, {
      names: {
        default: ['Unknown'],
        example: [],
        required: false,
        values: []
      }
    })

  it 'should compile an array href variable with values', ->
    hrefVariables = new fury.minim.elements.HrefVariables()
    hrefVariables.set('names', ['One', 'Two'])

    parameters = compileParams(hrefVariables)

    assert.deepEqual(parameters, {
      names: {
        default: undefined,
        example: ['One', 'Two'],
        required: false,
        values: []
      }
    })

  it 'should compile an array href variable with default', ->
    hrefVariables = new fury.minim.elements.HrefVariables()
    hrefVariables.set('names', [])
    hrefVariables.get('names').attributes.set('default', ['Unknown'])

    parameters = compileParams(hrefVariables)

    assert.deepEqual(parameters, {
      names: {
        default: ['Unknown'],
        example: [],
        required: false,
        values: []
      }
    })

  it 'should compile an enum href variable', ->
    hrefVariables = new fury.minim.elements.HrefVariables()
    value = new fury.minim.elements.Element()
    value.element = 'enum'
    value.attributes.set('enumerations', ['ascending', 'decending'])
    hrefVariables.set('order', value)

    parameters = compileParams(hrefVariables)

    assert.deepEqual(parameters, {
      order: {
        default: undefined,
        example: 'ascending',
        required: false,
        values: ['ascending', 'decending']
      }
    })

  it 'should compile an enum href variable with values', ->
    hrefVariables = new fury.minim.elements.HrefVariables()
    value = new fury.minim.elements.Element('decending')
    value.element = 'enum'
    value.attributes.set('enumerations', ['ascending', 'decending'])
    hrefVariables.set('order', value)

    parameters = compileParams(hrefVariables)

    assert.deepEqual(parameters, {
      order: {
        default: undefined,
        example: 'decending',
        required: false,
        values: ['ascending', 'decending']
      }
    })

  it 'should compile an enum href variable with default', ->
    hrefVariables = new fury.minim.elements.HrefVariables()
    value = new fury.minim.elements.Element()
    value.element = 'enum'
    value.attributes.set('enumerations', ['ascending', 'decending'])
    value.attributes.set('default', 'decending')
    hrefVariables.set('order', value)

    parameters = compileParams(hrefVariables)

    assert.deepEqual(parameters, {
      order: {
        default: 'decending',
        example: 'ascending',
        required: false,
        values: ['ascending', 'decending']
      }
    })
