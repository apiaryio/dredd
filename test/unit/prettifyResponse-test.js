const sinon = require('sinon');
const { assert } = require('chai');

const loggerStub = require('../../lib/logger');
const prettifyResponse = require('../../lib/prettifyResponse');

describe('prettifyResponse(response)', () => {
  describe('with a real object without any circular references', () => {
    it('should print JSON.stringified application/json header based response', () => {
      const output = prettifyResponse({
        headers: {
          'content-type': 'application/json',
        },
        body:
          { a: 'b' },
      });

      const expectedOutput = `\
headers: \n    content-type: application/json\n
body: \n{
  "a": "b"
}\n\
`;
      assert.equal(output, expectedOutput);
    });


    it('should print indented XML when content-type is text/html', () => {
      const output = prettifyResponse({
        headers: {
          'content-type': 'text/html',
        },
        body: '<div>before paragraph <p>in para <i>italics</i><br /><b>bold</b> afterwords</p></div>',
      });

      const expectedOutput = `\
headers: \n    content-type: text/html\n
body: \n<div>before paragraph
  <p>in para <i>italics</i>
    <br /><b>bold</b> afterwords</p>
</div>\n`;
      assert.equal(output, expectedOutput);
    });
  });

  describe('with an object in body that references itself (circular)', () => {
    before(() => {
      sinon.stub(loggerStub, 'debug');

      const body = { a: 'b' };
      body.c = body;

      prettifyResponse({
        headers: {
          'content-type': 'application/json',
        },
        body,
      });
    });

    after(() => sinon.stub(loggerStub.debug.restore()));

    it('should\'ve printed into debug', () => {
      assert.isOk(loggerStub.debug.called);
      assert.isObject(loggerStub.debug.firstCall);
      assert.isArray(loggerStub.debug.firstCall.args);
      assert.lengthOf(loggerStub.debug.firstCall.args, 1);
      assert.equal(loggerStub.debug.firstCall.args[0], 'Could not stringify: [object Object]');
    });
  });
});
