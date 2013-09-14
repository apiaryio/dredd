{assert} = require 'chai'
sinon = require 'sinon'
cliUtils = require '../../src/cli-utils'

describe 'cliUtils', () ->
  describe 'exit', () ->
    beforeEach () ->
      sinon.stub process, 'exit'
    
    afterEach () ->
      process.exit.restore()
    
    it 'should call process.exit', () ->
      cliUtils.exit(0)
      assert.ok process.exit.called


  describe 'log', () ->
    beforeEach () ->
      sinon.stub console, 'log'
    
    afterEach () ->
      console.log.restore()
    
    it 'should call console.log', () ->
      cliUtils.log('log entry')
      assert.ok console.log.called

  describe 'error', () ->
    beforeEach () ->
      sinon.stub console, 'error'
    
    afterEach () ->
      console.error.restore()
    
    it 'should call console.log', () ->
      cliUtils.error('error entry')
      assert.ok console.error.called

