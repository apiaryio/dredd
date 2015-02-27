{assert} = require 'chai'

applyConfiguration = require '../../src/apply-configuration'

describe 'applyConfiguration(config)', () ->

  describe 'with legacy color=true', () ->
    it 'should contain options.color set to true', () ->
      conf = applyConfiguration options:color:'true'
      assert.deepPropertyVal conf, 'options.color', true

  describe 'with legacy color=false', () ->
    it 'should contain options.color set to false', () ->
      conf = applyConfiguration options:color:'false'
      assert.deepPropertyVal conf, 'options.color', false


