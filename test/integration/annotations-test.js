const sinon = require('sinon');
const { assert } = require('chai');

const Dredd = require('../../lib/Dredd');


function compileTransactions(apiDescription, logger, callback) {
  const dredd = new Dredd({ apiDescriptions: [apiDescription] });
  dredd.logger = logger;
  dredd.transactionRunner.run = sinon.stub().callsArg(1);
  dredd.run(callback);
}


describe('Parser and compiler annotations', () => {
  describe('when processing a file with parser warnings', () => {
    const logger = { debug: sinon.spy(), warn: sinon.spy() };
    let error;

    before((done) => {
      compileTransactions(`
FORMAT: 1A
# Dummy API
## Index [GET /]
+ Response
      `, logger, (compileError) => {
        error = compileError;
        done();
      });
    });

    it("doesn't abort Dredd", () => {
      assert.isUndefined(error);
    });
    it('logs the warnings with line numbers', () => {
      assert.match(
        logger.warn.getCall(0).args[0],
        /^parser warning in 'configuration\.apiDescriptions\[0\]': [\s\S]+ on line 5$/i
      );
    });
  });

  describe('when processing a file with parser errors', () => {
    const logger = { debug: sinon.spy(), error: sinon.spy() };
    let error;

    before((done) => {
      compileTransactions(`
FORMAT: 1A
# Dummy API
## Index [GET /]
+ Response
\t+ Body
      `, logger, (compileError) => {
        error = compileError;
        done();
      });
    });

    it('aborts Dredd', () => {
      assert.instanceOf(error, Error);
    });
    it('logs the errors with line numbers', () => {
      assert.match(
        logger.error.getCall(0).args[0],
        /^parser error in 'configuration\.apiDescriptions\[0\]': [\s\S]+ on line 6$/i
      );
    });
  });

  describe('when processing a file with compilation warnings', () => {
    const logger = { debug: sinon.spy(), warn: sinon.spy() };
    let error;

    before((done) => {
      compileTransactions(`
FORMAT: 1A
# Dummy API
## Index [GET /{foo}]
+ Response 200
      `, logger, (compileError) => {
        error = compileError;
        done();
      });
    });

    it("doesn't abort Dredd", () => {
      assert.isUndefined(error);
    });
    it('logs the warnings with a transaction path', () => {
      assert.match(
        logger.warn.getCall(0).args[0],
        /^compilation warning in 'configuration\.apiDescriptions\[0\]': [\s\S]+ \(Dummy API > Index > Index\)$/i
      );
    });
  });

  describe('when processing a file with compilation errors', () => {
    const logger = { debug: sinon.spy(), error: sinon.spy(), warn: sinon.spy() };
    let error;

    before((done) => {
      compileTransactions(`
FORMAT: 1A
# Dummy API
## Index [DELETE /{?param}]
+ Parameters
    + param (required)
+ Response 204
      `, logger, (compileError) => {
        error = compileError;
        done();
      });
    });

    it('aborts Dredd', () => {
      assert.instanceOf(error, Error);
    });
    it('logs the errors with a transaction path', () => {
      assert.match(
        logger.error.getCall(0).args[0],
        /^compilation error in 'configuration\.apiDescriptions\[0\]': [\s\S]+ \(Dummy API > Index > Index\)$/i
      );
    });
  });
});
