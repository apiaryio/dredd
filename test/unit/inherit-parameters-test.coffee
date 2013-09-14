{assert} = require 'chai'

inheritParameters = require '../../src/inherit-parameters'

describe 'inheritParameters()', () ->
  actual = 
    name:
      description: ''
      type: ''
      required: true
      default: ''
      example: 'waldo'
      values: ''
  
  inheriting = 
    name:
      description: ''
      type: ''
      required: true
      default: ''
      example: 'willy'
      values: ''
    limit:
      description: ''
      type: ''
      required: true
      default: ''
      example: 1
      values: ''

  
  data = null

  describe 'its return', () ->
    before () ->
      data = inheritParameters actual, inheriting

    it 'inheriting parameters should be added', () ->
      assert.include Object.keys(data), 'limit' 

    it 'actual values should not be overwriten by inheriting', () ->
      assert.equal data['name']['example'], 'waldo'