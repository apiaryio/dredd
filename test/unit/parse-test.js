const fury = require('fury');
const sinon = require('sinon');

const fixtures = require('../fixtures');
const parse = require('../../lib/parse');

const { assert } = require('../utils');

describe('parse()', () => {
  const reMediaType = /\w+\/[\w.+]+/;

  describe('when valid document gets correctly parsed', () =>
    fixtures.ordinary.forEachDescribe(({ source }) => {
      let error;
      let mediaType;
      let apiElements;

      beforeEach(done =>
        parse(source, (err, parseResult) => {
          error = err;
          if (parseResult) { ({ mediaType, apiElements } = parseResult); }
          done();
        })
      );

      it('produces no error', () => assert.isNull(error));
      it('produces API Elements', () => assert.isObject(apiElements));
      it('produces media type', () => assert.match(mediaType, reMediaType));
      it('the parse result is API Elements represented by minim objects', () => assert.instanceOf(apiElements, fury.minim.elements.ParseResult));
      it('the parse result contains no annotation elements', () => assert.isTrue(apiElements.annotations ? apiElements.annotations.isEmpty : undefined));
      it('the parse result contains source map elements', () => {
        const sourceMaps = apiElements
          .recursiveChildren
          .flatMap(element => element.sourceMapValue);
        assert.ok(sourceMaps.length);
      });
    })
  );

  describe('when invalid document causes error', () =>
    fixtures.parserError.forEachDescribe(({ source }) => {
      let error;
      let mediaType;
      let apiElements;

      beforeEach(done =>
        parse(source, (err, parseResult) => {
          error = err;
          if (parseResult) { ({ mediaType, apiElements } = parseResult); }
          done();
        })
      );

      it('produces error', () => assert.instanceOf(error, Error));
      it('produces API Elements', () => assert.isObject(apiElements));
      it('produces media type', () => assert.match(mediaType, reMediaType));
      it('the parse result contains annotation elements', () => assert.isFalse(apiElements.annotations ? apiElements.annotations.isEmpty : undefined));
      it('the annotations are errors', () => assert.equal(apiElements.errors ? apiElements.errors.length : undefined, apiElements.annotations.length));
    })
  );

  describe('when defective document causes warning', () =>
    fixtures.parserWarning.forEachDescribe(({ source }) => {
      let error;
      let mediaType;
      let apiElements;

      beforeEach(done =>
        parse(source, (err, parseResult) => {
          error = err;
          if (parseResult) { ({ mediaType, apiElements } = parseResult); }
          done();
        })
      );

      it('produces no error', () => assert.isNull(error));
      it('produces API Elements', () => assert.isObject(apiElements));
      it('produces media type', () => assert.match(mediaType, reMediaType));
      it('the parse result contains annotation elements', () => assert.isFalse(apiElements.annotations ? apiElements.annotations.isEmpty : undefined));
      it('the annotations are warnings', () => assert.equal(apiElements.warnings ? apiElements.warnings.length : undefined, apiElements.annotations.length));
    })
  );

  describe('when unexpected parser behavior causes \'unexpected parser error\'', () => {
    let error;
    let apiElements;

    beforeEach((done) => {
      sinon.stub(fury, 'parse').callsFake((...args) => args.pop()());
      return parse('... dummy API description document ...', (err, parseResult) => {
        error = err;
        if (parseResult) { ({ apiElements } = parseResult); }
        return done();
      });
    });
    afterEach(() => fury.parse.restore());

    it('produces error', () => assert.instanceOf(error, Error));
    it('the error is the \'unexpected parser error\' error', () => assert.include(error.message.toLowerCase(), 'unexpected parser error'));
    it('produces no parse result', () => assert.isNull(apiElements));
  });

  describe('when completely unknown document format is treated as API Blueprint', () => {
    let error;
    let mediaType;
    let apiElements;

    beforeEach(done =>
      parse('... dummy API description document ...', (err, parseResult) => {
        error = err;
        if (parseResult) { ({ mediaType, apiElements } = parseResult); }
        done();
      })
    );

    it('produces no error', () => assert.isNull(error));
    it('produces API Elements', () => assert.isObject(apiElements));
    it('produces media type', () => assert.match(mediaType, reMediaType));
    it('the parse result contains annotation elements', () => assert.isFalse(apiElements.annotations ? apiElements.annotations.isEmpty : undefined));
    it('the annotations are warnings', () => assert.equal(apiElements.warnings ? apiElements.warnings.length : undefined, apiElements.annotations.length));
    it('the first warning is about falling back to API Blueprint', () => assert.include(apiElements.warnings.getValue(0), 'to API Blueprint'));
  });

  describe('when unrecognizable API Blueprint is treated as API Blueprint', () => {
    let error;
    let mediaType;
    let apiElements;

    beforeEach(done =>
      parse(fixtures.unrecognizable.apiBlueprint, (err, parseResult) => {
        error = err;
        if (parseResult) { ({ mediaType, apiElements } = parseResult); }
        done();
      })
    );

    it('produces no error', () =>
      assert.isNull(error)
    );
    it('produces API Elements', () =>
      assert.isObject(apiElements)
    );
    it('produces media type', () =>
      assert.match(mediaType, reMediaType)
    );
    it('the parse result contains annotation elements', () =>
      assert.isFalse(apiElements.annotations.isEmpty)
    );
    it('the annotations are warnings', () =>
      assert.equal(apiElements.warnings.length, apiElements.annotations.length)
    );
    it('the first warning is about falling back to API Blueprint', () =>
      assert.include(apiElements.warnings.getValue(0), 'to API Blueprint')
    );
  });
});
