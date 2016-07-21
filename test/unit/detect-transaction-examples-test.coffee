
{assert} = require('../utils')
drafter = require('drafter')

detectTransactionExamples = require('../../src/detect-transaction-examples')


# Encapsulates a single test scenario.
scenario = (description, {actionContent, examples, exampleNumbersPerTransaction}) ->
  describe("#{description}", ->
    returnValue = undefined
    apiBlueprint = """
      FORMAT: 1A
      # Gargamel API
      # Group Smurfs
      ## Smurfs [/smurfs]
      ### Catch a Smurf [POST]
      #{actionContent}
    """
    action = undefined # API Blueprint AST
    transition = undefined # API Elements (a.k.a. Refract)

    beforeEach((done) ->
      options = {type: 'ast', generateSourceMap: true}
      drafter.parse(apiBlueprint, options, (err, parseResult) ->
        return done(err) if err
        action = parseResult.ast.resourceGroups[0].resources[0].actions[0]
        done()
      )
    )
    beforeEach((done) ->
      options = {type: 'refract', generateSourceMap: true}
      drafter.parse(apiBlueprint, options, (err, parseResult) ->
        return done(err) if err
        transition = parseResult.content[0].content[0].content[0].content[0]
        done()
      )
    )
    beforeEach( ->
      returnValue = detectTransactionExamples(transition)
    )

    it('worked \'in situ\' and returned no value', ->
      assert.isUndefined(returnValue)
    )
    it('transition got expected total number of examples', ->
      expected = Math.max.apply(null, [0].concat(exampleNumbersPerTransaction))
      assert.equal(transition.attributes.examples, expected)
    )
    it('transactions got expected example numbers', ->
      expected = []
      for example, exampleIndex in action.examples
        for requestIndex in [0...(example.requests.length or 1)]
          for responseIndex in [0...(example.responses.length or 1)]
            expected.push(exampleIndex + 1)

      assert.deepEqual(
        expected,
        (trans.attributes?.example for trans in transition.content)
      )
    )
  )


describe('detectTransactionExamples()', ->
  describe('various combinations of requests and responses', ->
    scenario('empty action',
      actionContent: ''
      exampleNumbersPerTransaction: []
    )

    scenario('single request',
      actionContent: '''
        + Request (application/json)
      '''
      exampleNumbersPerTransaction: [1]
    )

    scenario('single response',
      actionContent: '''
        + Response 200
      '''
      exampleNumbersPerTransaction: [1]
    )

    scenario('single response followed by another example',
      actionContent: '''
        + Response 200

        + Request (application/json)
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 2]
    )

    scenario('single response followed by a single request-response pair',
      actionContent: '''
        + Response 200

        + Request (application/json)
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 2]
    )

    scenario('single request-response pair',
      actionContent: '''
        + Request (application/json)
        + Response 200
      '''
      exampleNumbersPerTransaction: [1]
    )

    scenario('two request-response pairs',
      actionContent: '''
        + Request (application/json)
        + Response 200

        + Request (application/json)
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 2]
    )

    scenario('three request-response pairs',
      actionContent: '''
        + Request (application/json)
        + Response 200

        + Request (application/json)
        + Response 200

        + Request (application/json)
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 2, 3]
    )

    scenario('multiple requests with no response',
      actionContent: '''
        + Request (application/json)
        + Request (application/json)
        + Request (application/json)
      '''
      exampleNumbersPerTransaction: [1, 1, 1]
    )

    scenario('no request with multiple responses',
      actionContent: '''
        + Response 200
        + Response 200
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 1, 1]
    )

    scenario('no request with multiple responses followed by another example',
      actionContent: '''
        + Response 200
        + Response 200
        + Response 200

        + Request (application/json)
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 1, 1, 2]
    )

    scenario('multiple requests with single response',
      actionContent: '''
        + Request (application/json)
        + Request (application/json)
        + Request (application/json)
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 1, 1]
    )

    scenario('multiple requests with single response followed by another example',
      actionContent: '''
        + Request (application/json)
        + Request (application/json)
        + Request (application/json)
        + Response 200

        + Request (application/json)
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 1, 1, 2]
    )

    scenario('single request with multiple responses',
      actionContent: '''
        + Request (application/json)
        + Response 200
        + Response 200
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 1, 1]
    )

    scenario('single request with multiple responses followed by another example',
      actionContent: '''
        + Request (application/json)
        + Response 200
        + Response 200
        + Response 200

        + Request (application/json)
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 1, 1, 2]
    )

    scenario('multiple requests with multiple responses',
      actionContent: '''
        + Request (application/json)
        + Request (application/json)
        + Request (application/json)
        + Response 200
        + Response 200
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 1, 1, 1, 1, 1, 1, 1, 1]
    )

    scenario('multiple requests with multiple responses followed by another example',
      actionContent: '''
        + Request (application/json)
        + Request (application/json)
        + Request (application/json)
        + Response 200
        + Response 200
        + Response 200

        + Request (application/json)
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 1, 1, 1, 1, 1, 1, 1, 1, 2]
    )

    scenario('multiple requests with multiple responses followed by another multiple requests with multiple responses',
      actionContent: '''
        + Request (application/json)
        + Request (application/json)
        + Request (application/json)
        + Response 200
        + Response 200
        + Response 200

        + Request (application/json)
        + Request (application/json)
        + Response 200
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2]
    )
  )


  describe('various ways of specifying requests', ->
    scenario('bare',
      actionContent: '''
        + Request
        + Response 200

        + Request
        + Request
        + Response 200

        + Request
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )

    scenario('with Content-Type headers',
      actionContent: '''
        + Request (application/json)
        + Response 200

        + Request (application/json)
        + Request (application/json)
        + Response 200

        + Request (application/json)
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )

    scenario('with Headers section',
      actionContent: '''
        + Request
            + Headers
                X-Smurf: Papa Smurf
        + Response 200

        + Request
            + Headers
                X-Smurf: Smurfette
        + Request
            + Headers
                X-Smurf: Hefty Smurf
        + Response 200

        + Request
            + Headers
                X-Smurf: Brainy Smurf
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )

    scenario('with bare Headers section',
      actionContent: '''
        + Request
            + Headers
        + Response 200

        + Request
            + Headers
        + Request
            + Headers
        + Response 200

        + Request
            + Headers
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )

    scenario('with Attributes section',
      actionContent: '''
        + Request
            + Attributes
                + smurfColor: blue
        + Response 200

        + Request
            + Attributes
                + smurfColor: blue
        + Request
            + Attributes
                + smurfColor: blue
        + Response 200

        + Request
            + Attributes
                + smurfColor: blue
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )

    scenario('with bare Attributes section',
      actionContent: '''
        + Request
            + Attributes
        + Response 200

        + Request
            + Attributes
        + Request
            + Attributes
        + Response 200

        + Request
            + Attributes
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )

    scenario('with Body section',
      actionContent: '''
        + Request
            + Body
                {}
        + Response 200

        + Request
            + Body
                {}
        + Request
            + Body
                {}
        + Response 200

        + Request
            + Body
                {}
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )

    scenario('with bare Body section',
      actionContent: '''
        + Request
            + Body
        + Response 200

        + Request
            + Body
        + Request
            + Body
        + Response 200

        + Request
            + Body
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )

    scenario('with Schema section',
      actionContent: '''
        + Request
            + Schema
                {}
        + Response 200

        + Request
            + Schema
                {}
        + Request
            + Schema
                {}
        + Response 200

        + Request
            + Schema
                {}
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )

    scenario('with bare Schema section',
      actionContent: '''
        + Request
            + Schema
        + Response 200

        + Request
            + Schema
        + Request
            + Schema
        + Response 200

        + Request
            + Schema
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )
  )


  describe('various ways of specifying responses', ->
    scenario('bare',
      actionContent: '''
        + Request (application/json)
        + Response

        + Request (application/json)
        + Response
        + Response

        + Request (application/json)
        + Response
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )

    scenario('with satus codes',
      actionContent: '''
        + Request (application/json)
        + Response 200

        + Request (application/json)
        + Response 200
        + Response 200

        + Request (application/json)
        + Response 200
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )

    scenario('with Content-Type headers',
      actionContent: '''
        + Request (application/json)
        + Response (application/json)

        + Request (application/json)
        + Response (application/json)
        + Response (application/json)

        + Request (application/json)
        + Response (application/json)
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )

    scenario('with Headers section',
      actionContent: '''
        + Request (application/json)
        + Response
            + Headers
                X-Smurf: Brainy Smurf

        + Request (application/json)
        + Response
            + Headers
                X-Smurf: Grouchy Smurf
        + Response
            + Headers
                X-Smurf: Clumsy Smurf

        + Request (application/json)
        + Response
            + Headers
                X-Smurf: Greedy Smurf
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )

    scenario('with bare Headers section',
      actionContent: '''
        + Request (application/json)
        + Response
            + Headers

        + Request (application/json)
        + Response
            + Headers
        + Response
            + Headers

        + Request (application/json)
        + Response
            + Headers
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )

    scenario('with Attributes section',
      actionContent: '''
        + Request (application/json)
        + Response
            + Attributes
                + smurfColor: blue

        + Request (application/json)
        + Response
            + Attributes
                + smurfColor: blue
        + Response
            + Attributes
                + smurfColor: blue

        + Request (application/json)
        + Response
            + Attributes
                + smurfColor: blue
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )

    scenario('with bare Attributes section',
      actionContent: '''
        + Request (application/json)
        + Response
            + Attributes

        + Request (application/json)
        + Response
            + Attributes
        + Response
            + Attributes

        + Request (application/json)
        + Response
            + Attributes
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )

    scenario('with Body section',
      actionContent: '''
        + Request (application/json)
        + Response
            + Body
                {}

        + Request (application/json)
        + Response
            + Body
                {}
        + Response
            + Body
                {}

        + Request (application/json)
        + Response
            + Body
                {}
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )

    scenario('with bare Body section',
      actionContent: '''
        + Request (application/json)
        + Response
            + Body

        + Request (application/json)
        + Response
            + Body
        + Response
            + Body

        + Request (application/json)
        + Response
            + Body
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )

    scenario('with Schema section',
      actionContent: '''
        + Request (application/json)
        + Response
            + Schema
                {}

        + Request (application/json)
        + Response
            + Schema
                {}
        + Response
            + Schema
                {}

        + Request (application/json)
        + Response
            + Schema
                {}
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )

    scenario('with bare Schema section',
      actionContent: '''
        + Request (application/json)
        + Response
            + Schema

        + Request (application/json)
        + Response
            + Schema
        + Response
            + Schema
                {}

        + Request (application/json)
        + Response
            + Schema
      '''
      exampleNumbersPerTransaction: [1, 2, 2, 3]
    )
  )
)
