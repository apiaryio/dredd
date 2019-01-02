const { assert } = require('chai');

const blueprintUtils = require('../../lib/blueprintUtils');

describe('blueprintUtils', () => {
  const placeholderText = '';

  describe('characterIndexToPosition()', () => {
    describe('under standard circumstances', () => it('returns an object with non-zero-based row', () => {
      const str = 'first\nsecond\nthird lines\ncontent continues';
      const position = blueprintUtils.characterIndexToPosition(str.indexOf('lines', str), str);
      assert.deepEqual(position, { row: 3 });
    }));

    describe('when given one-line input and zero index', () => it('returns an object with row 1', () => {
      const str = 'hello\n';
      const position = blueprintUtils.characterIndexToPosition(str.indexOf('hello', str), str);
      assert.deepEqual(position, { row: 1 });
    }));
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
        [str.indexOf('ten'), 3],
      ];
      const ranges = blueprintUtils.warningLocationToRanges(location, str);
      assert.isArray(ranges);
      assert.lengthOf(ranges, 3);
      assert.deepEqual(ranges, [
        { start: 2, end: 4 },
        { start: 6, end: 8 },
        { start: 10, end: 10 },
      ]);
    });

    it('works for some API description warnings too', () => {
      const apiDescription = `\
# Indented API

## GET /url
+ Response 200 (text/plain)

  wrongly indented
  resp.body

+ Response 404 (text/plain)

        ok indentation\
`;
      const annotation = {
        element: 'annotation',
        meta: { classes: ['warning'] },
        attributes: {
          code: 10,
          sourceMap: [
            {
              element: 'sourceMap',
              content: [[59, 17], [78, 10]],
            },
          ],
        },
        content:
          'message-body asset is expected to be a pre-formatted code '
          + 'block, every of its line indented by exactly 8 spaces or 2 tabs',
      };

      location = [];
      for (const sourceMap of annotation.attributes.sourceMap) {
        location = location.concat(sourceMap.content);
      }
      assert.isAbove(location.length, 0);

      const ranges = blueprintUtils.warningLocationToRanges(location, apiDescription);
      assert.isArray(ranges);
      assert.lengthOf(ranges, 1);
      assert.deepEqual(ranges, [{ start: 6, end: 7 }]);
    });

    it('returns an empty Array for empty locations', () => assert.deepEqual(blueprintUtils.warningLocationToRanges([], placeholderText), []));

    it('returns an empty Array for undefined locations', () => assert.deepEqual(blueprintUtils.warningLocationToRanges(undefined, placeholderText), []));
  });

  describe('rangesToLinesText()', () => {
    describe('when tested on fake locations', () => it('should return a string of line(s) separated with comma', () => {
      const line = blueprintUtils.rangesToLinesText([
        { start: 2, end: 4 },
        { start: 8, end: 8 },
        { start: 10, end: 15 },
      ]);
      assert.strictEqual(line, 'lines 2-4, line 8, lines 10-15');
    }));

    describe('for a real API description document', () => {
      const allRanges = [];
      const apiDescription = `\
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
      const annotations = [
        {
          element: 'annotation',
          meta: { classes: ['warning'] },
          attributes: {
            code: 10,
            sourceMap: [
              {
                element: 'sourceMap',
                content: [[70, 23], [95, 24]],
              },
            ],
          },
          content:
            'message-body asset is expected to be a pre-formatted code '
            + 'block, every of its line indented by exactly 8 spaces or 2 tabs',
        },
        {
          element: 'annotation',
          meta: { classes: ['warning'] },
          attributes: {
            code: 10,
            sourceMap: [
              {
                element: 'sourceMap',
                content: [[168, 39]],
              },
            ],
          },
          content:
            'headers is expected to be a pre-formatted code block, every '
            + 'of its line indented by exactly 12 spaces or 3 tabs',
        },
        {
          element: 'annotation',
          meta: { classes: ['warning'] },
          attributes: {
            code: 10,
            sourceMap: [
              {
                element: 'sourceMap',
                content: [[224, 33]],
              },
            ],
          },
          content:
            'message-body asset is expected to be a pre-formatted code '
            + 'block, every of its line indented by exactly 12 spaces or 3 tabs',
        },
        {
          element: 'annotation',
          meta: { classes: ['warning'] },
          attributes: {
            code: 10,
            sourceMap: [
              {
                element: 'sourceMap',
                content: [[302, 12], [318, 12], [334, 14]],
              },
            ],
          },
          content:
            'message-body asset is expected to be a pre-formatted code '
            + 'block, every of its line indented by exactly 8 spaces or 2 tabs',
        },
      ];

      for (const annotation of annotations) {
        let location = [];
        for (const sourceMap of annotation.attributes.sourceMap) {
          location = location.concat(sourceMap.content);
        }
        allRanges.push(blueprintUtils.warningLocationToRanges(location, apiDescription));
      }

      it('shows ~ 4 warnings', () => assert.equal(annotations.length, 4));

      it('prints lines for those warnings', () => {
        const expectedLines = [
          'lines 5-6',
          'line 12',
          'line 16',
          'lines 21-23',
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
