{assert} = require 'chai'

inheritHeaders = require '../../src/inherit-headers'

describe 'inheritHeaders()', () ->
  actual = 
    'Accept':
      value: 'application/json'
    'Content-Type':
      value: 'application/json'
  
  inheriting = 
    'Accept':
      value: '*/*'
    'Cache-Control':
      value: 'max-age=3600'
  
  data = null

  describe 'its return', () ->
    before () ->
      data = inheritHeaders actual, inheriting

    it 'inheriting headers should be added', () ->
      assert.include Object.keys(data), 'Cache-Control' 

    it 'actual values should not be overwriten by inheriting', () ->
      assert.equal data['Accept']['value'], 'application/json'