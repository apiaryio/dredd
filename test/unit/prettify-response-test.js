const {assert} = require('chai');
const sinon = require('sinon');

const loggerStub = require('../../src/logger');
const prettifyResponse = require('../../src/prettify-response');

describe('prettifyResponse(response)', function() {
  describe('with a real object without any circular references', function() {
    it('should print JSON.stringified application/json header based response', function() {
      const output = prettifyResponse({
        headers: {
          'content-type': 'application/json'
        },
        body:
          {'a':'b'}});

      const expectedOutput = `\
headers: \n    content-type: application/json\n
body: \n{
  "a": "b"
}\n\
`;
      return assert.equal(output, expectedOutput);
    });


    return it('should print indented XML when content-type is text/html', function() {
      const output = prettifyResponse({
        headers: {
          'content-type': 'text/html'
        },
        body: '<div>before paragraph <p>in para <i>italics</i><br /><b>bold</b> afterwords</p></div>'
      });

      const expectedOutput = `\
headers: \n    content-type: text/html\n
body: \n<div>before paragraph
  <p>in para <i>italics</i>
    <br /><b>bold</b> afterwords</p>
</div>\n`;
      return assert.equal(output, expectedOutput);
    });
  });

  return describe('with an object in body that references itself (circular)', function() {
    let output = null;

    before(function() {
      sinon.stub(loggerStub, 'debug');

      const body = {'a':'b'};
      body.c = body;

      return output = prettifyResponse({
        headers: {
          'content-type': 'application/json'
        },
        body
      });
    });

    after(() => sinon.stub(loggerStub.debug.restore()));

    return it('should\'ve printed into debug', function() {
      assert.isOk(loggerStub.debug.called);
      assert.isObject(loggerStub.debug.firstCall);
      assert.isArray(loggerStub.debug.firstCall.args);
      assert.lengthOf(loggerStub.debug.firstCall.args, 1);
      return assert.equal(loggerStub.debug.firstCall.args[0], 'Could not stringify: [object Object]');
    });
  });
});
