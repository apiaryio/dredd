{assert} = require 'chai'
boilerplate = require '../../src/npm-boilerplate'

it 'should have boil() function', () ->
  assert.isFunction boilerplate.boil