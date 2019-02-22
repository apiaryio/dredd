const fury = require('fury');

const parse = require('../../lib/parse');

const { assert, fixtures } = require('../support');


describe('parse()', () => {
  const reMediaType = /\w+\/[\w.+]+/;

  describe('when valid document gets correctly parsed', () => fixtures('ordinary').forEachDescribe(({ apiDescription }) => {
    let error;
    let mediaType;
    let apiElements;

    beforeEach(done => parse(apiDescription, (err, parseResult) => {
      error = err;
      if (parseResult) { ({ mediaType, apiElements } = parseResult); }
      done();
    }));

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
  }));

  describe('when invalid document causes error', () => fixtures('parser-error').forEachDescribe(({ apiDescription }) => {
    let error;
    let mediaType;
    let apiElements;

    beforeEach(done => parse(apiDescription, (err, parseResult) => {
      error = err;
      if (parseResult) { ({ mediaType, apiElements } = parseResult); }
      done();
    }));

    it('produces no error', () => assert.isNull(error));
    it('produces API Elements', () => assert.isObject(apiElements));
    it('produces media type', () => assert.match(mediaType, reMediaType));
    it('the parse result contains annotation elements', () => assert.isFalse(apiElements.annotations ? apiElements.annotations.isEmpty : undefined));
    it('the annotations are errors', () => assert.equal(apiElements.errors ? apiElements.errors.length : undefined, apiElements.annotations.length));
  }));

  describe('when defective document causes warning', () => fixtures('parser-warning').forEachDescribe(({ apiDescription }) => {
    let error;
    let mediaType;
    let apiElements;

    beforeEach(done => parse(apiDescription, (err, parseResult) => {
      error = err;
      if (parseResult) { ({ mediaType, apiElements } = parseResult); }
      done();
    }));

    it('produces no error', () => assert.isNull(error));
    it('produces API Elements', () => assert.isObject(apiElements));
    it('produces media type', () => assert.match(mediaType, reMediaType));
    it('the parse result contains annotation elements', () => assert.isFalse(apiElements.annotations ? apiElements.annotations.isEmpty : undefined));
    it('the annotations are warnings', () => assert.equal(apiElements.warnings ? apiElements.warnings.length : undefined, apiElements.annotations.length));
  }));

  describe('when completely unknown document format is treated as API Blueprint', () => {
    let error;
    let mediaType;
    let apiElements;

    beforeEach(done => parse('... dummy API description document ...', (err, parseResult) => {
      error = err;
      if (parseResult) { ({ mediaType, apiElements } = parseResult); }
      done();
    }));

    it('produces no error', () => assert.isNull(error));
    it('produces API Elements', () => assert.isObject(apiElements));
    it('produces media type', () => assert.match(mediaType, reMediaType));
    it('the parse result contains annotation elements', () => assert.isFalse(apiElements.annotations ? apiElements.annotations.isEmpty : undefined));
    it('the annotations are warnings', () => assert.equal(apiElements.warnings ? apiElements.warnings.length : undefined, apiElements.annotations.length));
    it('the first warning is about falling back to API Blueprint', () => assert.include(apiElements.warnings.getValue(0), 'assuming API Blueprint'));
  });

  describe('when unrecognizable API Blueprint is treated as API Blueprint', () => {
    let error;
    let mediaType;
    let apiElements;

    beforeEach(done => parse(fixtures('unrecognizable').apib.apiDescription, (err, parseResult) => {
      error = err;
      if (parseResult) { ({ mediaType, apiElements } = parseResult); }
      done();
    }));

    it('produces no error', () => assert.isNull(error));
    it('produces API Elements', () => assert.isObject(apiElements));
    it('produces media type', () => assert.match(mediaType, reMediaType));
    it('the parse result contains annotation elements', () => assert.isFalse(apiElements.annotations.isEmpty));
    it('the annotations are warnings', () => assert.equal(apiElements.warnings.length, apiElements.annotations.length));
    it('the first warning is about falling back to API Blueprint', () => assert.include(apiElements.warnings.getValue(0), 'assuming API Blueprint'));
  });
});
