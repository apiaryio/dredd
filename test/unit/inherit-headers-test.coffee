{assert} = require 'chai'

inheritHeaders = require '../../src/inherit-headers'

describe 'inheritHeaders()', () ->
  actual = 
    'Accept': 'application/json'
    'Content-Type': 'application/json'
  
  inheriting = 
    'Accept': '*/*'
    'Cache-Control': 'max-age=3600'
  
  data = null

  describe 'its return', () ->
    before () ->
      data = inheritHeaders actual, inheriting

    it 'inheriting headers should be added', () ->
      assert.include Object.keys(data), 'Cache-Control' 

    it 'actual values should not be overwriten by inheriting', () ->
      assert.equal data['Accept'], 'application/json'