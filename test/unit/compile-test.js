const { assert } = require('chai');

const {
  _compileBody: compileBody,
  _hasMultipartBody: hasMultipartBody,
} = require('../../lib/compile');


describe('compile()', () => {
  describe('compileBody()', () => {
    const body = [
      '',
      '--BOUNDARY ',
      'content-disposition: form-data; name="mess12"',
      '',
      '{"message":"mess1"}',
      '--BOUNDARY',
      '',
      'Content-Disposition: form-data; name="mess2"',
      '',
      '{"message":"mess1"}',
      '--BOUNDARY--',
    ];
    const bodyLF = body.join('\n');
    const bodyCRLF = body.join('\r\n');

    it('defaults to empty string on empty input', () => {
      assert.equal(compileBody(), '');
    });
    it('defaults to empty string on empty element value', () => {
      assert.equal(compileBody({ toValue: () => null }), '');
    });
    it('fixes line feeds in multipart bodies', () => {
      assert.equal(compileBody({ toValue: () => bodyLF }, true), bodyCRLF);
    });
    it('does not touch line feeds in multipart bodies if they are already correct', () => {
      assert.equal(compileBody({ toValue: () => bodyCRLF }, true), bodyCRLF);
    });
    it('does not replace line feeds in non-multipart bodies', () => {
      assert.equal(compileBody({ toValue: () => bodyLF }), bodyLF);
    });
  });

  describe('hasMultipartBody()', () => {
    it('detects multipart message', () => {
      assert.isTrue(hasMultipartBody([
        { name: 'X-Answer', value: '42' },
        { name: 'Content-Type', value: 'multipart/form-data' },
      ]));
    });
    it('detects non-multipart message', () => {
      assert.isFalse(hasMultipartBody([
        { name: 'X-Answer', value: '42' },
        { name: 'Content-Type', value: 'application/json' },
      ]));
    });
    it('is case-insensitive when looking up the header', () => {
      assert.isTrue(hasMultipartBody([
        { name: 'CoNtEnT-tYpE', value: 'multipart/form-data' },
      ]));
    });
    it('is case-insensitive when evaluating the header value', () => {
      assert.isTrue(hasMultipartBody([
        { name: 'Content-Type', value: 'MULTIpart/form-DATA' },
      ]));
    });
    it('is generous when evaluating the header value', () => {
      assert.isTrue(hasMultipartBody([
        { name: 'Content-Type', value: 'multipart/form-data; charset=foobar' },
      ]));
    });
  });
});
