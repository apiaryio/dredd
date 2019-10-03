import sinon from 'sinon';
import { assert } from 'chai';

import Dredd from '../../lib/Dredd';

function compileTransactions(apiDescription, logger, callback) {
  const dredd = new Dredd({ apiDescriptions: [apiDescription] });
  dredd.logger = logger;
  dredd.transactionRunner.run = sinon.stub().callsArg(1);
  dredd.run(callback);
}

describe('Parser and compiler annotations', () => {
  describe('when processing a file with parser warnings', () => {
    const logger = { debug: sinon.spy(), log: sinon.spy() };
    let error;

    before((done) => {
      compileTransactions(
        `
FORMAT: 1A
# Dummy API
## Index [GET /]
+ Response
      `,
        logger,
        (compileError) => {
          error = compileError;
          done();
        },
      );
    });

    it("doesn't abort Dredd", () => {
      assert.isUndefined(error);
    });
    it('logs warnings', () => {
      assert.equal(logger.log.getCall(0).args[0], 'warn');
    });
    it('logs the warnings with line numbers', () => {
      assert.match(
        logger.log.getCall(0).args[1],
        /parser warning in configuration\.apiDescriptions\[0\]:5 \(from line 5 column 3 to column 11\)/i,
      );
    });
  });

  describe('when processing a file with parser errors', () => {
    const logger = { debug: sinon.spy(), log: sinon.spy() };
    let error;

    before((done) => {
      compileTransactions(
        `
FORMAT: 1A
# Dummy API
## Index [GET /]
+ Response
\t+ Body
      `,
        logger,
        (compileError) => {
          error = compileError;
          done();
        },
      );
    });

    it('aborts Dredd', () => {
      assert.instanceOf(error, Error);
    });
    it('logs errors', () => {
      assert.equal(logger.log.getCall(0).args[0], 'error');
    });
    it('logs the errors with line numbers', () => {
      assert.match(
        logger.log.getCall(0).args[1],
        /parser error in configuration\.apiDescriptions\[0\]:6 \(line 6 column 1\)/i,
      );
    });
  });

  describe('when processing a file with compilation warnings', () => {
    const logger = { debug: sinon.spy(), log: sinon.spy() };
    let error;

    before((done) => {
      compileTransactions(
        `
FORMAT: 1A
# Dummy API
## Index [GET /{foo}]
+ Response 200
      `,
        logger,
        (compileError) => {
          error = compileError;
          done();
        },
      );
    });

    it("doesn't abort Dredd", () => {
      assert.isUndefined(error);
    });
    it('logs warnings', () => {
      assert.equal(logger.log.getCall(0).args[0], 'warn');
    });
    it('logs the warnings with a transaction path', () => {
      assert.match(
        logger.log.getCall(0).args[1],
        /uri template expansion warning in configuration\.apiDescriptions\[0\] \(Dummy API > Index > Index\)/i,
      );
    });
  });

  describe('when processing a file with compilation errors', () => {
    const logger = { debug: sinon.spy(), log: sinon.spy() };
    let error;

    before((done) => {
      compileTransactions(
        `
FORMAT: 1A
# Dummy API
## Index [DELETE /{?param}]
+ Parameters
    + param (required)
+ Response 204
      `,
        logger,
        (compileError) => {
          error = compileError;
          done();
        },
      );
    });

    it('aborts Dredd', () => {
      assert.instanceOf(error, Error);
    });
    it('logs errors', () => {
      assert.equal(logger.log.getCall(0).args[0], 'error');
    });
    it('logs the errors with a transaction path', () => {
      assert.match(
        logger.log.getCall(0).args[1],
        /uri parameters validation error in configuration\.apiDescriptions\[0\] \(Dummy API > Index > Index\)/i,
      );
    });
  });
});
