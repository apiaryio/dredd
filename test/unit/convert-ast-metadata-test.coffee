{assert} = require 'chai'

convertAstMetadata = require '../../src/convert-ast-metadata'

describe 'convertAstMetadata()', () ->
  metadata = [
    {
      name: 'name'
      description: ''
      type: ''
      required: true
      default: ''
      example: 'willy'
      values: ''
      }
    ,
    {
      name: 'limit'
      description: ''
      type: ''
      required: true
      default: ''
      example: 1
      values: ''
    }
  ]
  
  data = null

  describe 'its return', () ->
    before () ->
      data = convertAstMetadata metadata
    
    it 'should return an object', () ->
      assert.isObject data

    it 'should contain keys with names limit and name', () ->
      assert.include Object.keys(data), 'limit'
      assert.include Object.keys(data), 'name'

    it 'values should not contain "name" key', () ->
      for key, values of data
        assert.notInclude Object.keys(values), 'name'

    it 'should return empty hash if input is undefined', () ->
      assert.deepEqual {}, convertAstMetadata undefined