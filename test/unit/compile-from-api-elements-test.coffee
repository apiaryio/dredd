
{assert} = require('chai')
protagonist = require('protagonist')
fs = require('fs')
path = require('path')


{compileFromApiElements} = require('../../src/compile-from-api-elements')


describe "compileFromApiElements()", ->
  filename = path.join(__dirname, '../fixtures/blueprint.apib')
  code = fs.readFileSync(filename).toString()
  parseResult = undefined

  data = {}

  before((done) ->
    protagonist.parse(code, {type: 'refract', generateSourceMap: true}, (err, result) ->
      return done(err) if err
      data = compileFromApiElements(result, filename)
      done()
    )
  )

  describe 'its return', ->
    it 'should return an object', ->
      assert.isObject data

    ['transactions', 'errors', 'warnings'].forEach (key) ->
      it 'should have key \'' + key + "'", ->
        assert.include Object.keys(data), key

    describe 'transactions', ->
      it 'should not be empty', ->
        assert.notEqual data['transactions'].length, 0

    describe 'each entry under errors', ->
      errors = []
      before ->
        errors = data['errors']

      it 'should have origin keys', ->
        errors.forEach (error, index) ->
          assert.isDefined error['origin'], 'Warning index ' + index

    describe 'each entry under warnings', ->
      warnings = []
      before ->
        warnings = data['warnings']

      it 'should have origin keys', ->
        warnings.forEach (warning, index) ->
          assert.isDefined warning['origin'], 'Warning index ' + index

    describe 'each entry under transactions', ->
      transactions = []
      before ->
        transactions = data['transactions']

      ['origin', 'request', 'response'].forEach (key) ->
        it 'should have "' + key + '" key', ->
          transactions.forEach (transaction, index) ->
            assert.isDefined transaction[key], 'Transaction index ' + index

      describe 'value under origin key', ->
        it 'is an object', ->
          transactions.forEach (transaction, index) ->
            assert.isObject transaction['origin'], 'Transaction index ' + index

        it 'have filename property with file name from second param', ->
          transactions.forEach (transaction, index) ->
            assert.property transaction['origin'], 'filename', 'Transaction index ' + index
            assert.equal transaction['origin']['filename'], filename, 'Transaction index ' + index

        it 'have apiName property', ->
          transactions.forEach (transaction, index) ->
            assert.property transaction['origin'], 'apiName', 'Transaction index ' + index
            assert.equal transaction['origin']['apiName'], 'Machines API', 'Transaction index ' + index

      describe 'value under request key', ->
        ['uri', 'method', 'headers', 'body'].forEach (key) ->
          it 'has key: ' + key , ->
            transactions.forEach (transaction, index) ->
              assert.isDefined transaction['request'][key], 'Transaction index ' + index

          it 'value under key \'' + key + '\' is not null', ->
            transactions.forEach (transaction, index) ->
              assert.isNotNull transaction['request'][key], 'Transaction index ' + index

      describe 'value under response key', ->
        it 'is an object', ->
          transactions.forEach (transaction, index) ->
            assert.isObject transaction['response'], 'Transaction index ' + index

        ['status', 'headers', 'body'].forEach (key) ->
          it 'has key: ' + key , ->
            transactions.forEach (transaction, index) ->
              assert.isDefined transaction['response'][key], 'Transaction index ' + index

  describe 'when some warning in URI expanding appear', ->
    before((done) ->
      codeWithoutParamSections = code.replace(/\+ Parameters\n(\s+\+ .+)+/, '')
      protagonist.parse(codeWithoutParamSections, {type: 'refract', generateSourceMap: true}, (err, result) ->
        return done(err) if err
        parseResult = result
        done()
      )
    )

    it 'should have piped all warnings from expandUriTemplate', ->
      data = compileFromApiElements parseResult
      assert.notEqual data['warnings'].length, 0

  describe 'when some error in URI parameters validation appear', ->
    before((done) ->
      codeWithChangedParamSections = code.replace(/  \+ name[^\n]+/gi, '  + name (required)')
      protagonist.parse(codeWithChangedParamSections, {type: 'refract', generateSourceMap: true}, (err, result) ->
        return done(err) if err
        parseResult = result
        done()
      )
    )

    it 'should have piped all errors from validateParameters', ->
      data = compileFromApiElements parseResult
      assert.notEqual data['errors'].length, 0

  describe 'when some error in URI expanding appear', ->
    before((done) ->
      codeWithInvalidUriTemplate = code.replace(' [/machines', ' [/machines{')
      protagonist.parse(codeWithInvalidUriTemplate, {type: 'refract', generateSourceMap: true}, (err, result) ->
        return done(err) if err
        parseResult = result
        done()
      )
    )

    it 'should have piped all errors from expandUriTemplate', ->
      data = compileFromApiElements parseResult
      assert.notEqual data['errors'].length, 0

  describe 'when no api name, group name, resource name and action name in ast', ->
    transaction = null

    before((done) ->
      code = fs.readFileSync(path.join(__dirname, '../fixtures/simple-unnamed.apib')).toString()
      protagonist.parse(code, {type: 'refract', generateSourceMap: true}, (err, result) ->
        return done(err) if err
        data = compileFromApiElements result, filename
        transaction = data['transactions'][0]
        done()
      )
    )

    it 'should use filename as api name', ->
      assert.equal transaction['origin']['apiName'], filename

    # should not be possible specify more than one unnamed group, must verify
    #it 'should use Group + group index as group name', ->
    #  assert.equal transaction['origin']['resourceGroupName'], 'Group 1'

    it 'should use URI for resource name', ->
      assert.equal transaction['origin']['resourceName'], '/message'

    it 'should use method for action name', ->
      assert.equal transaction['origin']['actionName'], 'GET'

  describe 'when some action have multiple examples', ->

    filename = './path/to/blueprint.apib'
    transactions = null

    before((done) ->
      code = fs.readFileSync(path.join(__dirname, '../fixtures/multiple-examples.apib')).toString()
      protagonist.parse(code, {type: 'refract', generateSourceMap: true}, (err, result) ->
        return done(err) if err
        transactions = compileFromApiElements(result, filename)['transactions']
        done()
      )
    )

    it 'should set exampleName for first transaction to "Example 1"', ->
      assert.equal transactions[0]['origin']['exampleName'], "Example 1"

    it 'should set exampleName for second transaction to "Example 2"', ->
      assert.equal transactions[1]['origin']['exampleName'], "Example 2"

  describe 'when some action doesn\'t have multiple examples', ->

    filename = './path/to/blueprint.apib'
    transactions = null

    before((done) ->
      code = fs.readFileSync(path.join(__dirname, '../fixtures/single-get.apib')).toString()
      protagonist.parse(code, {type: 'refract', generateSourceMap: true}, (err, result) ->
        return done(err) if err
        transactions = compileFromApiElements(result, filename)['transactions']
        done()
      )
    )

    it 'should let example name intact', ->
      assert.equal transactions[0]['origin']['exampleName'], ''

  describe 'when arbitrary action is present', ->
    transactions = null

    before((done) ->
      code = fs.readFileSync(path.join(__dirname, '../fixtures/arbitrary-action.apib')).toString()
      protagonist.parse(code, {type: 'refract', generateSourceMap: true}, (err, result) ->
        return done(err) if err
        transactions = compileFromApiElements(result, filename)['transactions']
        done()
      )
    )

    it 'first (normal) action should have resource uri', ->
      assert.equal transactions[0].request.uri, '/resource/1'

    it 'first (normal) action should have its method', ->
      assert.equal transactions[0].request.method, 'POST'

    it 'second (arbitrary) action should have uri from the action', ->
      assert.equal transactions[1].request.uri, '/resource-cool-url/othervalue'

    it 'second (arbitrary) action should have its method', ->
      assert.equal transactions[1].request.method, 'GET'
