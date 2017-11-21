const sinon = require('sinon');
const fury = require('fury');

const {assert} = require('../utils');
const fixtures = require('../fixtures');
const parse = require('../../src/parse');


describe('Parsing API description document', function() {
  const reMediaType = /\w+\/[\w\.\+]+/;

  describe('Valid document gets correctly parsed', () =>
    fixtures.ordinary.forEachDescribe(function({source}) {
      let error = undefined;
      let mediaType = undefined;
      let apiElements = undefined;

      beforeEach(done =>
        parse(source, function(err, parseResult) {
          error = err;
          if (parseResult) { ({mediaType, apiElements} = parseResult); }
          return done();
        })
      );

      it('produces no error', () => assert.isNull(error));
      it('produces API Elements', () => assert.isObject(apiElements));
      it('produces media type', () => assert.match(mediaType, reMediaType));
      it('the parse result is API Elements represented by minim objects', () => assert.instanceOf(apiElements, fury.minim.elements.ParseResult));
      it('the parse result contains no annotation elements', () => assert.isTrue(apiElements.annotations != null ? apiElements.annotations.isEmpty : undefined));
      return it('the parse result contains source map elements', function() {
        const sourceMaps = apiElements
          .recursiveChildren
          .flatMap(element => element.sourceMapValue);
        return assert.ok(sourceMaps.length);
      });
    })
  );

  describe('Invalid document causes error', () =>
    fixtures.parserError.forEachDescribe(function({source}) {
      let error = undefined;
      let mediaType = undefined;
      let apiElements = undefined;

      beforeEach(done =>
        parse(source, function(err, parseResult) {
          error = err;
          if (parseResult) { ({mediaType, apiElements} = parseResult); }
          return done();
        })
      );

      it('produces error', () => assert.instanceOf(error, Error));
      it('produces API Elements', () => assert.isObject(apiElements));
      it('produces media type', () => assert.match(mediaType, reMediaType));
      it('the parse result contains annotation elements', () => assert.isFalse(apiElements.annotations != null ? apiElements.annotations.isEmpty : undefined));
      return it('the annotations are errors', () => assert.equal(apiElements.errors != null ? apiElements.errors.length : undefined, apiElements.annotations.length));
    })
  );

  describe('Defective document causes warning', () =>
    fixtures.parserWarning.forEachDescribe(function({source}) {
      let error = undefined;
      let mediaType = undefined;
      let apiElements = undefined;

      beforeEach(done =>
        parse(source, function(err, parseResult) {
          error = err;
          if (parseResult) { ({mediaType, apiElements} = parseResult); }
          return done();
        })
      );

      it('produces no error', () => assert.isNull(error));
      it('produces API Elements', () => assert.isObject(apiElements));
      it('produces media type', () => assert.match(mediaType, reMediaType));
      it('the parse result contains annotation elements', () => assert.isFalse(apiElements.annotations != null ? apiElements.annotations.isEmpty : undefined));
      return it('the annotations are warnings', () => assert.equal(apiElements.warnings != null ? apiElements.warnings.length : undefined, apiElements.annotations.length));
    })
  );

  describe('Unexpected parser behavior causes \'unexpected parser error\'', function() {
    let error = undefined;
    let mediaType = undefined;
    let apiElements = undefined;

    beforeEach(function(done) {
      sinon.stub(fury, 'parse').callsFake((...args) => args.pop()());
      return parse('... dummy API description document ...', function(err, parseResult) {
        error = err;
        if (parseResult) { ({mediaType, apiElements} = parseResult); }
        return done();
      });
    });
    afterEach( () => fury.parse.restore());

    it('produces error', () => assert.instanceOf(error, Error));
    it('the error is the \'unexpected parser error\' error', () => assert.include(error.message.toLowerCase(), 'unexpected parser error'));
    return it('produces no parse result', () => assert.isNull(apiElements));
  });

  describe('Completely unknown document format is treated as API Blueprint', function() {
    let error = undefined;
    let mediaType = undefined;
    let apiElements = undefined;

    beforeEach(done =>
      parse('... dummy API description document ...', function(err, parseResult) {
        error = err;
        if (parseResult) { ({mediaType, apiElements} = parseResult); }
        return done();
      })
    );

    it('produces no error', () => assert.isNull(error));
    it('produces API Elements', () => assert.isObject(apiElements));
    it('produces media type', () => assert.match(mediaType, reMediaType));
    it('the parse result contains annotation elements', () => assert.isFalse(apiElements.annotations != null ? apiElements.annotations.isEmpty : undefined));
    it('the annotations are warnings', () => assert.equal(apiElements.warnings != null ? apiElements.warnings.length : undefined, apiElements.annotations.length));
    return it('the first warning is about falling back to API Blueprint', () => assert.include(apiElements.warnings.getValue(0), 'to API Blueprint'));
  });

  return describe('Unrecognizable API Blueprint is treated as API Blueprint', function() {
    let error = undefined;
    let mediaType = undefined;
    let apiElements = undefined;

    beforeEach(done =>
      parse(fixtures.unrecognizable.apiBlueprint, function(err, parseResult) {
        error = err;
        if (parseResult) { ({mediaType, apiElements} = parseResult); }
        return done();
      })
    );

    it('produces no error', () => assert.isNull(error));
    it('produces API Elements', () => assert.isObject(apiElements));
    it('produces media type', () => assert.match(mediaType, reMediaType));
    it('the parse result contains annotation elements', () => assert.isFalse(apiElements.annotations != null ? apiElements.annotations.isEmpty : undefined));
    it('the annotations are warnings', () => assert.equal(apiElements.warnings != null ? apiElements.warnings.length : undefined, apiElements.annotations.length));
    return it('the first warning is about falling back to API Blueprint', () => assert.include(apiElements.warnings.getValue(0), 'to API Blueprint'));
  });
});
