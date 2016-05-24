
{assert} = require 'chai'

dreddTransactions = require '../../src/dredd-transactions'


describe "compiled transaction paths", ->
  describe "Full notation with multiple request-response pairs", ->

    it 'should have expected path', (done) ->
      code = '''
      # Some API Name

      ## Group Some Group Name

      ### Some Resource Name [/resource]

      #### Some Action Name [GET]

      + Request (application/json)
      + Response 200 (application/json)

      + Request (application/xml)
      + Response 200 (application/xml)
      '''

      expected = "Some API Name:Some Group Name:Some Resource Name:Some Action Name:Example 2"

      paths = []
      dreddTransactions.compile(code, null, (err, {transactions}) ->
        return done(err) if err

        # console.log JSON.stringify transactions, null, 2
        for transaction in transactions
          paths.push transaction.path
        assert.include paths, expected, "Array:\n#{JSON.stringify(paths)}\ndoesn't contain string:\n '#{expected}'\n"
        done()
      )



  describe "Full notation without group", ->
    it 'should have expected path', (done) ->
      code = '''
      # Some API Name

      ### Some Resource Name [/resource]

      #### Some Action Name [GET]

      + Request (application/json)
      + Response 200 (application/json)
      '''

      expected = "Some API Name::Some Resource Name:Some Action Name:Example 1"

      paths = []
      dreddTransactions.compile(code, null, (err, {transactions}) ->
        return done(err) if err
        for transaction in transactions
          paths.push transaction.path
        assert.include paths, expected, "Array:\n#{JSON.stringify(paths)}\ndoesn't contain string:\n '#{expected}'\n"
        done()
      )

  describe "Full notation without group and API name", ->
    it 'should have expected path', (done) ->
      code = '''
      ### Some Resource Name [/resource]

      #### Some Action Name [GET]

      + Request (application/json)
      + Response 200 (application/json)
      '''

      expected = "::Some Resource Name:Some Action Name:Example 1"

      paths = []
      dreddTransactions.compile(code, null, (err, {transactions}) ->
        return done(err) if err
        for transaction in transactions
          paths.push transaction.path
        assert.include paths, expected, "Array:\n#{JSON.stringify(paths)}\ndoesn't contain string:\n '#{expected}'\n"
        done()
      )

  describe "Full notation without group and API name with a colon", ->
    it 'should have expected path', (done) ->
      code = '''
      # My API: Revamp

      ### Some Resource Name [/resource]

      #### Some Action Name [GET]

      + Request (application/json)
      + Response 200 (application/json)
      '''

      expected = "My API\\: Revamp::Some Resource Name:Some Action Name:Example 1"

      paths = []
      dreddTransactions.compile(code, null, (err, {transactions}) ->
        return done(err) if err
        for transaction in transactions
          paths.push transaction.path
        assert.include paths, expected, "Array:\n#{JSON.stringify(paths)}\ndoesn't contain string:\n '#{expected}'\n"
        done()
      )


  describe "simplified notation", ->
    it 'should have expected path', (done) ->
      code = '''
      # GET /message
      + Response 200 (text/plain)

            Hello World
      '''

      expected = "::/message:GET:Example 1"

      paths = []
      dreddTransactions.compile(code, null, (err, {transactions}) ->
        return done(err) if err
        for transaction in transactions
          paths.push transaction.path
        assert.include paths, expected, "Array:\n#{JSON.stringify(paths)}\ndoesn't contain string:\n '#{expected}'\n"
        done()
      )
