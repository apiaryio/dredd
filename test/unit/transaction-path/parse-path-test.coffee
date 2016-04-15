{assert} = require 'chai'
parsePath = require '../../../src/transaction-path/parse-path'
{ESCAPE_CHAR, DELIMITER} = require '../../../src/transaction-path/constants'

describe 'parsePath', ->

  it 'should be a function', ->
    assert.isFunction parsePath

  it 'should return an array', ->
    assert.isArray parsePath("#{DELIMITER}#{DELIMITER}#{DELIMITER}#{DELIMITER}")

  it 'returned array should have 5 members', ->
    assert.equal parsePath("#{DELIMITER}#{DELIMITER}#{DELIMITER}#{DELIMITER}").length,
      5

  it 'each member of returned array should be a string', ->
    for item, index in parsePath("#{DELIMITER}#{DELIMITER}#{DELIMITER}#{DELIMITER}")
      assert.isString item, "on index #{index}"

  describe 'when path contains more than 4 unescaped delimiters 4', ->
    it 'should throw', ->
      fn = ->
        parsePath("#{DELIMITER}#{DELIMITER}#{DELIMITER}#{DELIMITER}#{DELIMITER}")
      assert.throws fn

  describe 'when path contains escaped delimiter with a backslash', ->
    it 'should be in the string in one of the parsed parts', ->
      path =
        ESCAPE_CHAR + DELIMITER +
        DELIMITER +
        ESCAPE_CHAR + DELIMITER +
        DELIMITER +
        ESCAPE_CHAR + DELIMITER +
        DELIMITER +
        ESCAPE_CHAR + DELIMITER +
        DELIMITER +
        ESCAPE_CHAR + DELIMITER

      parsed = parsePath(path)

      for part,index in parsed
        assert.equal part, ":", "on index #{index}"

  describe 'with a complex example', ->

    it 'should have proper parsed parts', ->

      path = "a:b\\b:c\\:C:ddd\\::eeee\\:"

      parsed = parsePath(path)

      assert.propertyVal parsed, 0, 'a'
      assert.propertyVal parsed, 1, 'b\\b'
      assert.propertyVal parsed, 2, 'c:C'
      assert.propertyVal parsed, 3, 'ddd:'
      assert.propertyVal parsed, 4, 'eeee:'
