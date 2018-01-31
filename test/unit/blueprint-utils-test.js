const drafter = require('drafter');
const { assert } = require('chai');

const blueprintUtils = require('../../src/blueprint-utils');

describe('blueprintUtils', () => {
  const placeholderText = '';
  const options = { type: 'refract' };

  describe('characterIndexToPosition()', () => {
    describe('under standard circumstances', () =>
      it('returns an object with non-zero-based row', () => {
        const str = 'first\nsecond\nthird lines\ncontent continues';
        const position = blueprintUtils.characterIndexToPosition(str.indexOf('lines', str), str);
        assert.deepEqual(position, { row: 3 });
      })
    );

    describe('when given one-line input and zero index', () =>
      it('returns an object with row 1', () => {
        const str = 'hello\n';
        const position = blueprintUtils.characterIndexToPosition(str.indexOf('hello', str), str);
        assert.deepEqual(position, { row: 1 });
      })
    );
  });

  describe('warningLocationToRanges()', () => {
    let str = null;
    let location = [];

    it('keeps ranges that follow each other line-numbers, but also resolves single-lines', () => {
      str = 'one\ntwo\nthree\nfour\nfive\nsix\nseven\neight\nnine\nten';
      location = [
        [str.indexOf('two'), 2],
        [str.indexOf('three'), 2],
        [str.indexOf('four'), 2],
        // Keep some lines of
        [str.indexOf('six'), 2],
        [str.indexOf('seven'), 2],
        [str.indexOf('eight'), 2],
        // Also add just one single line warning location
        [str.indexOf('ten'), 3]
      ];
      const ranges = blueprintUtils.warningLocationToRanges(location, str);
      assert.isArray(ranges);
      assert.lengthOf(ranges, 3);
      assert.deepEqual(ranges, [
        { start: 2, end: 4 },
        { start: 6, end: 8 },
        { start: 10, end: 10 }
      ]);
    });

    it('works for some API description warnings too', (done) => {
      const blueprint = `\
# Indented API

## GET /url
+ Response 200 (text/plain)

  wrongly indented
  resp.body

+ Response 404 (text/plain)

        ok indentation\
`;
      return drafter.parse(blueprint, options, (err, parseResult) => {
        if (err) { return done(new Error(err.message)); }

        const annotations = (Array.from(parseResult.content).filter(node => node.element === 'annotation'));
        assert.isAbove(annotations.length, 0);
        const annotation = annotations[0];

        location = [];
        for (const sourceMap of annotation.attributes.sourceMap) {
          location = location.concat(sourceMap.content);
        }
        assert.isAbove(location.length, 0);

        const ranges = blueprintUtils.warningLocationToRanges(location, blueprint);
        assert.isArray(ranges);
        assert.lengthOf(ranges, 1);
        assert.deepEqual(ranges, [{ start: 6, end: 7 }]);
        done();
      });
    });

    it('returns an empty Array for empty locations', () => assert.deepEqual(blueprintUtils.warningLocationToRanges([], placeholderText), []));

    it('returns an empty Array for undefined locations', () => assert.deepEqual(blueprintUtils.warningLocationToRanges(undefined, placeholderText), []));
  });

  describe('rangesToLinesText()', () => {
    describe('when tested on fake locations', () =>

      it('should return a string of line(s) separated with comma', () => {
        const line = blueprintUtils.rangesToLinesText([
          { start: 2, end: 4 },
          { start: 8, end: 8 },
          { start: 10, end: 15 }
        ]);
        assert.strictEqual(line, 'lines 2-4, line 8, lines 10-15');
      })
    );

    describe('for a real API description document', () => {
      let warnings = 0;
      let blueprint = null;
      const allRanges = [];
      before((done) => {
        blueprint = `\
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

        yup!\
`;
        drafter.parse(blueprint, options, (err, parseResult) => {
          if (err) { return done(err); }

          const annotations = (Array.from(parseResult.content).filter(node => node.element === 'annotation'));
          warnings = annotations.length;

          for (const annotation of annotations) {
            let location = [];
            for (const sourceMap of annotation.attributes.sourceMap) {
              location = location.concat(sourceMap.content);
            }
            allRanges.push(blueprintUtils.warningLocationToRanges(location, blueprint));
          }
          done();
        });
      });

      it('shows ~ 4 warnings', () => assert.equal(warnings, 4));

      it('prints lines for those warnings', () => {
        const expectedLines = [
          'lines 5-6',
          'line 12',
          'line 16',
          'lines 21-23'
        ];
        const result = [];
        for (let lineIndex = 0; lineIndex < expectedLines.length; lineIndex++) {
          const expectedLine = expectedLines[lineIndex];
          const generatedLine = blueprintUtils.rangesToLinesText(allRanges[lineIndex]);
          assert.isString(expectedLine);
          result.push(assert.strictEqual(generatedLine, expectedLine));
        }
        return result;
      });
    });
  });
});
