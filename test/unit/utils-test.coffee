{assert} = require 'chai'

protagonist = require 'protagonist'
blueprintUtils = require '../../src/blueprint-utils'

describe 'blueprintUtils', () ->

  placeholderText = ''
  options = {type: 'ast'}

  describe 'characterIndexToPosition()', ->
    str = null

    it 'returns an object with non-zero-based row', ->
      str = "first\nsecond\nthird lines\ncontent continues"
      position = blueprintUtils.characterIndexToPosition str.indexOf('lines', str), str
      assert.deepEqual position, {row: 3}

  describe 'warningLocationToRanges()', ->
    str = null
    location = []

    it 'keeps ranges that follow each other line-numbers, but also resolves single-lines', ->
      str = "one\ntwo\nthree\nfour\nfive\nsix\nseven\neight\nnine\nten"
      location = [
        {index: str.indexOf('two'), length: 2}
        {index: str.indexOf('three'), length: 2}
        {index: str.indexOf('four'), length: 2}
        # keep some lines of
        {index: str.indexOf('six'), length: 2}
        {index: str.indexOf('seven'), length: 2}
        {index: str.indexOf('eight'), length: 2}
        # also add just one single line warning location
        {index: str.indexOf('ten'), length: 3}
      ]
      ranges = blueprintUtils.warningLocationToRanges location, str
      assert.isArray ranges
      assert.lengthOf ranges, 3
      assert.deepEqual ranges, [
        {start: 2, end: 4}
        {start:6, end: 8}
        {start: 10, end: 10}
      ]

    it 'works for some blueprint warnings too', (done) ->
      blueprint = """
      # Indented API

      ## GET /url
      + Response 200 (text/plain)

        wrongly indented
        resp.body

      + Response 404 (text/plain)

              ok indentation
      """
      protagonist.parse blueprint, options, (err, results) ->
        return done err if err
        assert.isObject results
        assert.property results, 'warnings'
        assert.isArray results.warnings
        assert.lengthOf results.warnings, 1
        assert.deepProperty results, 'warnings.0.location.0.index'
        assert.deepProperty results, 'warnings.0.location.0.length'
        ranges = blueprintUtils.warningLocationToRanges results.warnings[0].location, blueprint
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

    describe 'for a real blueprint', ->
      warnings = []
      blueprint = null
      ranges = []
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
        protagonist.parse blueprint, options, (err, results) ->
          warnings = results.warnings or []
          ranges = (blueprintUtils.warningLocationToRanges(warn.location, blueprint) for warn in warnings)
          done err

      it 'shows ~ 4 warnings', ->
        assert.lengthOf warnings, 4

      it 'prints lines for those warnings', ->
        expectedLines = [
          'lines 5-6'
          'line 12'
          'line 16'
          'lines 21-23'
        ]
        for expectedLine, lineIndex in expectedLines
          generatedLine = blueprintUtils.rangesToLinesText ranges[lineIndex]
          assert.isString expectedLine
          assert.strictEqual generatedLine, expectedLine

