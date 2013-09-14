{assert} = require 'chai'
blueprintAstToRuntime = require '../../src/blueprint-ast-to-runtime'

describe "blueprintAstToRuntime()", () ->
  blueprintAst = require '../fixtures/blueprint-ast'
  data = {}
  before () -> 
    data = blueprintAstToRuntime blueprintAst
  
  describe 'its return', () ->
    it 'shuold return an object', () ->
      assert.isObject data
  
    ['transactions', 'errors', 'warnings'].forEach (key) ->
      it 'should have key \'' + key + "'", () ->
        assert.include Object.keys(data), key

    describe 'transcactions', () ->
      it 'should not be empty', () ->
        assert.notEqual data['transactions'].length, 0 
    
    describe 'each entry under errors', () ->
      errors = []
      before () ->
        errors = data['errors']
      
      it 'should have origin keys', () ->
        errors.forEach (error, index) ->
          assert.isDefined error['origin'], 'Warning index ' + index

    describe 'each entry under warnings', () ->
      warnings = []
      before () ->
        warnings = data['warnings']
      
      it 'should have origin keys', () ->
        warnings.forEach (warning, index) ->
          assert.isDefined warning['origin'], 'Warning index ' + index
    
    describe 'each entry under transactions', () ->
      transactions = []
      before () ->
        transactions = data['transactions']
      
      ['origin', 'request', 'response'].forEach (key) ->
        it 'should have "' + key + '" key', () ->
          transactions.forEach (transaction, index) ->
            assert.isDefined transaction[key], 'Transaction index ' + index
     
      describe 'value under origin key', () ->
        it 'is an object', () ->
          transactions.forEach (transaction, index) ->
            assert.isObject transaction['origin'], 'Transaction index ' + index

      describe 'value under request key', () ->
        ['uri','method','headers','body'].forEach (key) ->
          it 'has key: ' + key , () ->
            transactions.forEach (transaction, index) ->
              assert.isDefined transaction['request'][key], 'Transaction index ' + index

          it 'value under key \'' + key + '\' is not null', () ->
            transactions.forEach (transaction, index) ->
              assert.isNotNull transaction['request'][key], 'Transaction index ' + index

      describe 'value under response key', () ->
        it 'is an object', () ->
          transactions.forEach (transaction, index) ->
            assert.isObject transaction['response'], 'Transaction index ' + index

        ['status','headers','body'].forEach (key) ->
          it 'has key: ' + key , () ->
            transactions.forEach (transaction, index) ->
              assert.isDefined transaction['response'][key], 'Transaction index ' + index

  describe 'when some warning in URI expanding appear', () ->
    it 'should have piped all warnings from expandUriTemplate', () ->
      blueprintAst = require '../fixtures/blueprint-ast'
      blueprintAst['resourceGroups'][0]['resources'][1]['parameters'] = {}
      blueprintAst['resourceGroups'][0]['resources'][1]['actions'][0]['parameters'] = {}

      data = blueprintAstToRuntime blueprintAst
      assert.notEqual data['warnings'].length, 0  

  describe 'when some error in URI expanding appear', () ->
    it 'should have piped all errors from expandUriTemplate', () ->
      blueprintAst = require '../fixtures/blueprint-ast'
      blueprintAst['resourceGroups'][0]['resources'][1]['uriTemplate'] = '/machines{{/name}'
      data = blueprintAstToRuntime blueprintAst
      assert.notEqual data['errors'].length, 0       

  describe 'when some warning in example selecting appear', () ->
    before () ->
      response = 
        name: 418
        headers: {}
        body: ""

      blueprintAst['resourceGroups'][0]['resources'][0]['actions'][0]['examples'][0]['responses'].push response
      data = blueprintAstToRuntime blueprintAst

    it 'should have piped all warnings from exampleToHttpPayloadPair', () ->
      assert.notEqual data['warnings'].length, 0      

