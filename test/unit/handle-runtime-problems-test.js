/* eslint-disable
    no-return-assign,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.

const { assert } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const dreddTransactions = require('dredd-transactions');

const logger = require('../../src/logger');

const handleRuntimeProblems = proxyquire('../../src/handle-runtime-problems',
  { './logger': logger }
);


const prepareData = (apiDescriptionDocument, filename, done) =>
  dreddTransactions.compile(apiDescriptionDocument, filename, (err, { annotations }) => {
    if (err) { return done(err); }

    const data = {};
    data[filename] = { raw: apiDescriptionDocument, filename, annotations };

    return done(null, data);
  })
;


describe('handleRuntimeProblems()', () => {
  let warnOutput;
  let errorOutput;

  beforeEach(() => {
    warnOutput = '';
    errorOutput = '';

    sinon.stub(logger, 'warn').callsFake((...args) => warnOutput += args.join(' ').toLowerCase());
    return sinon.stub(logger, 'error').callsFake((...args) => errorOutput += args.join(' ').toLowerCase());
  });
  afterEach(() => {
    logger.warn.restore();
    return logger.error.restore();
  });

  describe('Prints parser error', () => {
    let error;

    const apiDescriptionDocument = `\
FORMAT: 1A
# Beehive API
\t\t\
`;
    const filename = 'dummy-filename.apib';

    beforeEach(done =>
      prepareData(apiDescriptionDocument, filename, (err, data) => {
        if (err) { return done(err); }
        error = handleRuntimeProblems(data);
        return done();
      })
    );

    it('returns error', () => assert.isOk(error));
    it('has no warning output', () => assert.equal(warnOutput, ''));
    it('has error output', () => assert.isOk(errorOutput));
    return context('the error output', () => {
      it('mentions it is from parser', () => assert.include(errorOutput, 'parser'));
      it('mentions it is error', () => assert.include(errorOutput, 'error'));
      it('mentions the filename', () => assert.include(errorOutput, filename));
      it('mentions the line', () => assert.include(errorOutput, 'on line 3'));
      it('does not contain any NaNs', () => assert.notInclude(errorOutput, 'nan'));
    });
  });

  describe('Prints parser warning', () => {
    let error;

    const apiDescriptionDocument = `\
FORMAT: 1A
# Beehive API
## Honey [/honey]
### Remove [DELETE]
+ Response\
`;
    const filename = 'dummy-filename.apib';

    beforeEach(done =>
      prepareData(apiDescriptionDocument, filename, (err, data) => {
        if (err) { return done(err); }
        error = handleRuntimeProblems(data);
        return done();
      })
    );

    it('returns no error', () => assert.notOk(error));
    it('has no error output', () => assert.equal(errorOutput, ''));
    it('has warning output', () => assert.isOk(warnOutput));
    return context('the warning output', () => {
      it('mentions it is from parser', () => assert.include(warnOutput, 'parser'));
      it('mentions it is warning', () => assert.include(warnOutput, 'warn'));
      it('mentions the filename', () => assert.include(warnOutput, filename));
      it('mentions the line', () => assert.include(warnOutput, 'on line 5'));
      it('does not contain any NaNs', () => assert.notInclude(warnOutput, 'nan'));
    });
  });

  describe('Prints warning about missing title', () => {
    let error;

    const apiDescriptionDocument = `\
FORMAT: 1A
So Long, and Thanks for All the Fish!\
`;
    const filename = 'dummy-filename.apib';

    beforeEach(done =>
      prepareData(apiDescriptionDocument, filename, (err, data) => {
        if (err) { return done(err); }
        error = handleRuntimeProblems(data);
        return done();
      })
    );

    it('returns no error', () => assert.notOk(error));
    it('has no error output', () => assert.equal(errorOutput, ''));
    it('has warning output', () => assert.isOk(warnOutput));
    return context('the warning output', () => {
      it('mentions it is from parser', () => assert.include(warnOutput, 'parser'));
      it('mentions it is warning', () => assert.include(warnOutput, 'warning'));
      it('mentions the filename', () => assert.include(warnOutput, filename));
      it('mentions the line', () => assert.include(warnOutput, 'on line 1'));
      it('does not contain any NaNs', () => assert.notInclude(warnOutput, 'nan'));
    });
  });
});
