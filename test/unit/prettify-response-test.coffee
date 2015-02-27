{assert} = require 'chai'
sinon = require 'sinon'

loggerStub = require '../../src/logger'
prettifyResponse = require '../../src/prettify-response'

describe 'prettifyResponse(response)', () ->
  describe 'with a real object without any circular references', () ->
    it 'should print JSON.stringified application/json header based response', () ->
      output = prettifyResponse
        headers:
          'content-type': 'application/json'
        body:
          {'a':'b'}

      expectedOutput = """
      headers: \n    content-type: application/json\n
      body: \n{
        "a": "b"
      }\n
      """
      assert.equal output, expectedOutput


    it 'should print indented XML when content-type is text/html', () ->
      output = prettifyResponse
        headers:
          'content-type': 'text/html'
        body: '<div>before paragraph <p>in para <i>italics</i><br /><b>bold</b> afterwords</p></div>'

      expectedOutput = """
      headers: \n    content-type: text/html\n
      body: \n<div>before paragraph
        <p>in para <i>italics</i>
          <br /><b>bold</b> afterwords</p>
      </div>\n"""
      assert.equal output, expectedOutput

  describe 'with an object in body that references itself (circular)', ->
    output = null

    before ->
      sinon.stub loggerStub, 'debug'

      body = {'a':'b'}
      body.c = body

      output = prettifyResponse
        headers:
          'content-type': 'application/json'
        body: body

    after ->
      sinon.stub loggerStub.debug.restore()

    it 'should\'ve printed into debug', () ->
      assert.ok loggerStub.debug.called
      assert.isObject loggerStub.debug.firstCall
      assert.isArray loggerStub.debug.firstCall.args
      assert.lengthOf loggerStub.debug.firstCall.args, 1
      assert.equal loggerStub.debug.firstCall.args[0], 'Could not stringify: [object Object]'
