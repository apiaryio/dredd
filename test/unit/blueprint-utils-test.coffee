{assert} = require 'chai'

protagonist = require 'protagonist'
blueprintUtils = require '../../src/blueprint-utils'

describe 'blueprintUtils', ->

  placeholderText = ''
  options = {type: 'refract'}

  describe 'characterIndexToPosition()', ->
    describe 'under standard circumstances', ->
      it 'returns an object with non-zero-based row', ->
        str = "first\nsecond\nthird lines\ncontent continues"
        position = blueprintUtils.characterIndexToPosition str.indexOf('lines', str), str
        assert.deepEqual position, {row: 3}

    describe 'when given one-line input and zero index', ->
      it 'returns an object with row 1', ->
        str = "hello\n"
        position = blueprintUtils.characterIndexToPosition str.indexOf('hello', str), str
        assert.deepEqual position, {row: 1}

  describe 'warningLocationToRanges()', ->
    str = null
    location = []

    it 'keeps ranges that follow each other line-numbers, but also resolves single-lines', ->
      str = "one\ntwo\nthree\nfour\nfive\nsix\nseven\neight\nnine\nten"
      location = [
        [str.indexOf('two'), 2]
        [str.indexOf('three'), 2]
        [str.indexOf('four'), 2]
        # keep some lines of
        [str.indexOf('six'), 2]
        [str.indexOf('seven'), 2]
        [str.indexOf('eight'), 2]
        # also add just one single line warning location
        [str.indexOf('ten'), 3]
      ]
      ranges = blueprintUtils.warningLocationToRanges location, str
      assert.isArray ranges
      assert.lengthOf ranges, 3
      assert.deepEqual ranges, [
        {start: 2, end: 4}
        {start:6, end: 8}
        {start: 10, end: 10}
      ]

    it 'works for some API description warnings too', (done) ->
      blueprint = """
        # Indented API

        ## GET /url
        + Response 200 (text/plain)

          wrongly indented
          resp.body

        + Response 404 (text/plain)

                ok indentation
      """
      protagonist.parse blueprint, options, (err, parseResult) ->
        return done new Error(err.message) if err

        annotations = (node for node in parseResult.content when node.element is 'annotation')
        assert.isAbove annotations.length, 0
        annotation = annotations[0]

        location = []
        for sourceMap in annotation.attributes.sourceMap
          location = location.concat(sourceMap.content)
        assert.isAbove location.length, 0

        ranges = blueprintUtils.warningLocationToRanges location, blueprint
        assert.isArray ranges
        assert.lengthOf ranges, 1
        assert.deepEqual ranges, [{start: 6, end: 7}]
        done()

    it 'returns an empty Array for empty locations', ->
      assert.deepEqual blueprintUtils.warningLocationToRanges([], placeholderText), []

    it 'returns an empty Array for undefined locations', ->
      assert.deepEqual blueprintUtils.warningLocationToRanges(undefined, placeholderText), []

  describe 'rangesToLinesText()', ->

    describe 'when tested on fake locations', ->

      it 'should return a string of line(s) separated with comma', ->
        line = blueprintUtils.rangesToLinesText [
          {start: 2, end: 4}
          {start: 8, end: 8}
          {start: 10, end: 15}
        ]
        assert.strictEqual line, 'lines 2-4, line 8, lines 10-15'

    describe 'for a real API description document', ->
      warnings = 0
      blueprint = null
      allRanges = []
      before (done) ->
        blueprint = """
        # Indentation warnings API
        ## GET /url
        + Response 200 (text/plain)

          badly indented 5. line
          responsing body 6. line

        + Response 400 (text/plain)

          + Headers

              headers-should-be:preformatted_12_line

          + Body

              not-enough indentation 16th line

        ## POST /create
        + Request (text/plain)

            is it body?
            maybe it is
            if you say so

        + Response 201

                yup!
        """
        protagonist.parse blueprint, options, (err, parseResult) ->
          return done err if err

          annotations = (node for node in parseResult.content when node.element is 'annotation')
          warnings = annotations.length

          for annotation in annotations
            location = []
            for sourceMap in annotation.attributes.sourceMap
              location = location.concat(sourceMap.content)
            allRanges.push(blueprintUtils.warningLocationToRanges(location, blueprint))
          done()

      it 'shows ~ 4 warnings', ->
        assert.equal warnings, 4

      it 'prints lines for those warnings', ->
        expectedLines = [
          'lines 5-6'
          'line 12'
          'line 16'
          'lines 21-23'
        ]
        for expectedLine, lineIndex in expectedLines
          generatedLine = blueprintUtils.rangesToLinesText allRanges[lineIndex]
          assert.isString expectedLine
          assert.strictEqual generatedLine, expectedLine
