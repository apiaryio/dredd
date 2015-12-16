{assert} = require 'chai'
protagonist = require 'protagonist'
fs = require 'fs'

blueprintAstToRuntime = require '../../src/blueprint-ast-to-runtime'


describe "blueprintAstToRuntime()", () ->
  blueprintAst = require '../fixtures/blueprint-ast'
  data = {}
  filename = './path/to/blueprint.apib'
  before () ->
    data = blueprintAstToRuntime blueprintAst, filename

  describe 'its return', () ->
    it 'should return an object', () ->
      assert.isObject data

    ['transactions', 'errors', 'warnings'].forEach (key) ->
      it 'should have key \'' + key + "'", () ->
        assert.include Object.keys(data), key

    describe 'transactions', () ->
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

        it 'have filename property with file name from second param', () ->
          transactions.forEach (transaction, index) ->
            assert.property transaction['origin'], 'filename', 'Transaction index ' + index
            assert.equal transaction['origin']['filename'], filename, 'Transaction index ' + index

        it 'have apiName property', () ->
          transactions.forEach (transaction, index) ->
            assert.property transaction['origin'], 'apiName', 'Transaction index ' + index
            assert.equal transaction['origin']['apiName'], 'Machines API', 'Transaction index ' + index

        it 'have uriTemplate property', () ->
          transactions.forEach (transaction, index) ->
            assert.property transaction['origin'], 'uriTemplate'

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

  describe 'when some error in URI parameters validation appear', () ->
    it 'should have piped all errors from validateParameters', () ->
      blueprintAst = require '../fixtures/blueprint-ast'
      params = [
        {
          name: 'name'
          description: 'Machine name'
          type: 'number'
          required: true
          example: 'waldo'
          default: ''
          values: []
        }
      ]

      blueprintAst['resourceGroups'][0]['resources'][1]['parameters'] = params
      data = blueprintAstToRuntime blueprintAst
      assert.notEqual data['errors'].length, 0

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

  describe 'when no api name, group name, resource name and action name in ast', () ->
    transaction = null
    filename = './path/to/blueprint.apib'
    before () ->
      simpleUnnamedAst = require '../fixtures/simple-unnamed-ast'
      data = blueprintAstToRuntime simpleUnnamedAst, filename
      transaction = data['transactions'][0]

    it 'should use filename as api name', () ->
      assert.equal transaction['origin']['apiName'], filename

    # should not be possible specify more than one unnamed group, must verify
    #it 'should use Group + group index as group name', () ->
    #  assert.equal transaction['origin']['resourceGroupName'], 'Group 1'

    it 'should use URI for resource name', () ->
      assert.equal transaction['origin']['resourceName'], '/message'

    it 'should use method for action name', () ->
      assert.equal transaction['origin']['actionName'], 'GET'

  describe 'when some action have multiple examples', () ->

    filename = './path/to/blueprint.apib'
    transactions = null

    before () ->
      simpleUnnamedAst = require '../fixtures/multiple-examples'
      transactions = blueprintAstToRuntime(simpleUnnamedAst, filename)['transactions']

    it 'should set exampleName for first transaction to "Example 1"', () ->
      assert.equal transactions[0]['origin']['exampleName'], "Example 1"

    it 'should set exampleName for second transaction to "Example 2"', () ->
      assert.equal transactions[1]['origin']['exampleName'], "Example 2"

  describe 'when some action doesn\'t have multiple examples', () ->

    filename = './path/to/blueprint.apib'
    transactions = null

    before () ->
      simpleUnnamedAst = require '../fixtures/single-get'
      transactions = blueprintAstToRuntime(simpleUnnamedAst, filename)['transactions']

    it 'should let example name intact', () ->
      assert.equal transactions[0]['origin']['exampleName'], ""

  describe 'when arbitrary action is present', () ->
    transactions = null

    before (done) ->
      filename = './test/fixtures/arbitrary-action.md'
      code = fs.readFileSync(filename).toString()
      options = {type: 'ast'}
      protagonist.parse code, options, (protagonistError, result) ->
        done(protagonistError) if protagonistError
        transactions = blueprintAstToRuntime(result['ast'], filename)['transactions']
        done()


    it 'first (normal) action should have resource uri', ->
      assert.equal transactions[0].request.uri, '/resource/1'

    it 'first (normal) action should have its method', ->
      assert.equal transactions[0].request.method, 'POST'

    it 'second (arbitrary) action should have uri from the action', ->
      assert.equal transactions[1].request.uri, '/resource-cool-url/othervalue'

    it 'second (arbitrary) action should have its method', ->
      assert.equal transactions[1].request.method, 'GET'


