import R from 'ramda';
import { assert } from 'chai';

import logger from '../../lib/logger';
import reporterOutputLogger from '../../lib/reporters/reporterOutputLogger';
import Dredd from '../../lib/Dredd';

const PORT = 9876;

let output = '';

function execCommand(options = {}, cb) {
  output = '';
  let finished = false;
  const defaultConfig = {
    server: `http://127.0.0.1:${PORT}`,
  };

  const dreddOptions = R.mergeDeepRight(defaultConfig, options);

  new Dredd(dreddOptions).run((error) => {
    if (error) {
      throw error;
    }

    if (!finished) {
      finished = true;
      if (error ? error.message : undefined) {
        output += error.message;
      }
      cb();
    }
  });
}

function record(transport, level, message) {
  output += `\n${level}: ${message}`;
}

// These tests were separated out from a larger file. They deserve a rewrite,
// see https://github.com/apiaryio/dredd/issues/1288
describe('OpenAPI 2', () => {
  before(() => {
    logger.transports.console.silent = true;
    logger.on('logging', record);

    reporterOutputLogger.transports.console.silent = true;
    reporterOutputLogger.on('logging', record);
  });

  after(() => {
    logger.transports.console.silent = false;
    logger.removeListener('logging', record);

    reporterOutputLogger.transports.console.silent = false;
    reporterOutputLogger.removeListener('logging', record);
  });

  describe('when OpenAPI 2 document has multiple responses', () => {
    const reTransaction = /(skip|fail): (\w+) \((\d+)\) \/honey/g;
    let actual;

    before((done) =>
      execCommand(
        {
          options: {
            path: './test/fixtures/multiple-responses.yaml',
          },
        },
        (err) => {
          let groups;
          const matches = [];
          // eslint-disable-next-line
          while ((groups = reTransaction.exec(output))) {
            matches.push(groups);
          }

          actual = matches.map((match) => {
            const keyMap = {
              0: 'name',
              1: 'action',
              2: 'method',
              3: 'statusCode',
            };
            return match.reduce(
              (result, element, i) =>
                Object.assign(result, { [keyMap[i]]: element }),
              {},
            );
          });
          done(err);
        },
      ),
    );

    it('recognizes all 3 transactions', () => assert.equal(actual.length, 3));
    [
      { action: 'skip', statusCode: '400' },
      { action: 'skip', statusCode: '500' },
      { action: 'fail', statusCode: '200' },
    ].forEach((expected, i) =>
      context(`the transaction #${i + 1}`, () => {
        it(`has status code ${expected.statusCode}`, () =>
          assert.equal(expected.statusCode, actual[i].statusCode));
        it(`is ${
          expected.action === 'skip' ? '' : 'not '
        }skipped by default`, () =>
          assert.equal(expected.action, actual[i].action));
      }),
    );
  });

  describe('when OpenAPI 2 document has multiple responses and hooks unskip some of them', () => {
    const reTransaction = /(skip|fail): (\w+) \((\d+)\) \/honey/g;
    let actual;

    before((done) => {
      execCommand(
        {
          options: {
            path: './test/fixtures/multiple-responses.yaml',
            hookfiles: './test/fixtures/openapi2-multiple-responses.js',
          },
        },
        (err) => {
          if (err) {
            throw err;
          }

          let groups;
          const matches = [];
          // eslint-disable-next-line
          while ((groups = reTransaction.exec(output))) {
            matches.push(groups);
          }
          actual = matches.map((match) => {
            const keyMap = {
              0: 'name',
              1: 'action',
              2: 'method',
              3: 'statusCode',
            };
            return match.reduce(
              (result, element, i) =>
                Object.assign(result, { [keyMap[i]]: element }),
              {},
            );
          });
          done(err);
        },
      );
    });

    it('recognizes all 3 transactions', () => assert.equal(actual.length, 3));
    [
      { action: 'skip', statusCode: '400' },
      { action: 'fail', statusCode: '200' },
      { action: 'fail', statusCode: '500' }, // Unskipped in hooks
    ].forEach((expected, i) =>
      context(`the transaction #${i + 1}`, () => {
        it(`has status code ${expected.statusCode}`, () =>
          assert.equal(expected.statusCode, actual[i].statusCode));

        const defaultMessage = `is ${
          expected.action === 'skip' ? '' : 'not '
        }skipped by default`;
        const unskippedMessage = 'is unskipped in hooks';
        it(`${
          expected.statusCode === '500' ? unskippedMessage : defaultMessage
        }`, () => assert.equal(expected.action, actual[i].action));
      }),
    );
  });

  describe('when using OpenAPI 2 document with hooks', () => {
    const reTransactionName = /hook: (.+)/g;
    let matches;

    before((done) =>
      execCommand(
        {
          options: {
            path: './test/fixtures/multiple-responses.yaml',
            hookfiles: './test/fixtures/openapi2-transaction-names.js',
          },
        },
        (err) => {
          let groups;
          matches = [];
          // eslint-disable-next-line
          while ((groups = reTransactionName.exec(output))) {
            matches.push(groups[1]);
          }
          done(err);
        },
      ),
    );

    it('transaction names contain status code and content type', () =>
      assert.deepEqual(matches, [
        '/honey > GET > 200 > application/json',
        '/honey > GET > 400 > application/json',
        '/honey > GET > 500 > application/json',
      ]));
  });
});
