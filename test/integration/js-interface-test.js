import sinon from 'sinon';
import { assert } from 'chai';

import Dredd from '../../lib/Dredd';
import { createServer, runDredd, runDreddWithServer } from './helpers';

const EXPECTED_STATS_KEYS = [
  'tests',
  'failures',
  'errors',
  'passes',
  'skipped',
  'start',
  'end',
  'duration',
];

describe('Running Dredd from JavaScript', () => {
  describe('when the testing is successful', () => {
    let runtimeInfo;

    before((done) => {
      const app = createServer();
      app.get('/machines', (req, res) =>
        res.json([{ type: 'bulldozer', name: 'willy' }]),
      );

      const dredd = new Dredd({
        options: { path: './test/fixtures/single-get.apib' },
      });
      runDreddWithServer(dredd, app, (err, info) => {
        runtimeInfo = info;
        done(err);
      });
    });

    it('requests the server', () => {
      assert.isTrue(runtimeInfo.server.requestedOnce);
    });
    it('passes no error to the callback', () => {
      assert.isNotOk(runtimeInfo.dredd.err);
    });
    it('passes expected stats to the callback', () => {
      assert.hasAllKeys(runtimeInfo.dredd.stats, EXPECTED_STATS_KEYS);
    });
    it('performs 1 test', () => {
      assert.equal(runtimeInfo.dredd.stats.tests, 1);
    });
    it('finishes with 0 failing tests', () => {
      assert.equal(runtimeInfo.dredd.stats.failures, 0);
    });
    it('finishes with 0 erroring tests', () => {
      assert.equal(runtimeInfo.dredd.stats.errors, 0);
    });
    it('finishes with 1 passing test', () => {
      assert.equal(runtimeInfo.dredd.stats.passes, 1);
    });
    it('finishes with 0 skipped tests', () => {
      assert.equal(runtimeInfo.dredd.stats.skipped, 0);
    });
    it('records start', () => {
      assert.instanceOf(runtimeInfo.dredd.stats.start, Date);
    });
    it('records end', () => {
      assert.instanceOf(runtimeInfo.dredd.stats.end, Date);
    });
    it('records duration', () => {
      assert.isAbove(runtimeInfo.dredd.stats.duration, 0);
    });
  });

  describe('when the testing is failing', () => {
    let runtimeInfo;

    before((done) => {
      const app = createServer();
      app.get('/machines', (req, res) => res.json([{ foo: 'bar' }]));

      const dredd = new Dredd({
        options: { path: './test/fixtures/single-get.apib' },
      });
      runDreddWithServer(dredd, app, (err, info) => {
        runtimeInfo = info;
        done(err);
      });
    });

    it('requests the server', () => {
      assert.isTrue(runtimeInfo.server.requestedOnce);
    });
    it('passes no error to the callback', () => {
      assert.isNotOk(runtimeInfo.dredd.err);
    });
    it('passes expected stats to the callback', () => {
      assert.hasAllKeys(runtimeInfo.dredd.stats, EXPECTED_STATS_KEYS);
    });
    it('performs 1 test', () => {
      assert.equal(runtimeInfo.dredd.stats.tests, 1);
    });
    it('finishes with 1 failing test', () => {
      assert.equal(runtimeInfo.dredd.stats.failures, 1);
    });
    it('finishes with 0 erroring tests', () => {
      assert.equal(runtimeInfo.dredd.stats.errors, 0);
    });
    it('finishes with 0 passing tests', () => {
      assert.equal(runtimeInfo.dredd.stats.passes, 0);
    });
    it('finishes with 0 skipped tests', () => {
      assert.equal(runtimeInfo.dredd.stats.skipped, 0);
    });
    it('records start', () => {
      assert.instanceOf(runtimeInfo.dredd.stats.start, Date);
    });
    it('records end', () => {
      assert.instanceOf(runtimeInfo.dredd.stats.end, Date);
    });
    it('records duration', () => {
      assert.isAbove(runtimeInfo.dredd.stats.duration, 0);
    });
  });

  describe('when the testing is erroring', () => {
    let dreddRuntimeInfo;

    before((done) => {
      const dredd = new Dredd({
        options: { path: './test/fixtures/single-get.apib' },
      });
      runDredd(dredd, (err, info) => {
        dreddRuntimeInfo = info;
        done(err);
      });
    });

    it('passes no error to the callback', () => {
      assert.isNotOk(dreddRuntimeInfo.err);
    });
    it('passes expected stats to the callback', () => {
      assert.hasAllKeys(dreddRuntimeInfo.stats, EXPECTED_STATS_KEYS);
    });
    it('performs 1 test', () => {
      assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('finishes with 0 failing tests', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 0);
    });
    it('finishes with 1 erroring test', () => {
      assert.equal(dreddRuntimeInfo.stats.errors, 1);
    });
    it('finishes with 0 passing tests', () => {
      assert.equal(dreddRuntimeInfo.stats.passes, 0);
    });
    it('finishes with 0 skipped tests', () => {
      assert.equal(dreddRuntimeInfo.stats.skipped, 0);
    });
    it('records start', () => {
      assert.instanceOf(dreddRuntimeInfo.stats.start, Date);
    });
    it('records end', () => {
      assert.instanceOf(dreddRuntimeInfo.stats.end, Date);
    });
    it('records duration', () => {
      assert.isAbove(dreddRuntimeInfo.stats.duration, 0);
    });
  });

  describe('when API descriptions loading is erroring', () => {
    let dreddRuntimeInfo;

    before((done) => {
      const dredd = new Dredd({ options: { path: '__non-existing__.apib' } });
      runDredd(dredd, (err, info) => {
        dreddRuntimeInfo = info;
        done(err);
      });
    });

    it('passes error to the callback', () => {
      assert.instanceOf(dreddRuntimeInfo.err, Error);
    });
    it('passes expected stats to the callback', () => {
      assert.hasAllKeys(dreddRuntimeInfo.stats, EXPECTED_STATS_KEYS);
    });
    it('performs 0 tests', () => {
      assert.equal(dreddRuntimeInfo.stats.tests, 0);
    });
    it('finishes with 0 failing tests', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 0);
    });
    it('finishes with 0 erroring tests', () => {
      assert.equal(dreddRuntimeInfo.stats.errors, 0);
    });
    it('finishes with 0 passing tests', () => {
      assert.equal(dreddRuntimeInfo.stats.passes, 0);
    });
    it('finishes with 0 skipped tests', () => {
      assert.equal(dreddRuntimeInfo.stats.skipped, 0);
    });
    it('does not record start', () => {
      assert.equal(dreddRuntimeInfo.stats.start, 0);
    });
    it('does not record end', () => {
      assert.equal(dreddRuntimeInfo.stats.end, 0);
    });
    it('does not record duration', () => {
      assert.equal(dreddRuntimeInfo.stats.duration, 0);
    });
  });

  describe('when running transactions is erroring', () => {
    let dreddRuntimeInfo;
    const error = new Error('Ouch!');

    before((done) => {
      const dredd = new Dredd({
        options: { path: './test/fixtures/single-get.apib' },
      });
      sinon.stub(dredd.transactionRunner, 'run').callsArgWithAsync(1, error);

      runDredd(dredd, (err, info) => {
        dreddRuntimeInfo = info;
        done(err);
      });
    });

    it('passes the error to the callback', () => {
      assert.deepEqual(dreddRuntimeInfo.err, error);
    });
    it('passes expected stats to the callback', () => {
      assert.hasAllKeys(dreddRuntimeInfo.stats, EXPECTED_STATS_KEYS);
    });
    it('performs 0 tests', () => {
      assert.equal(dreddRuntimeInfo.stats.tests, 0);
    });
    it('finishes with 0 failing tests', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 0);
    });
    it('finishes with 0 erroring tests', () => {
      assert.equal(dreddRuntimeInfo.stats.errors, 0);
    });
    it('finishes with 0 passing tests', () => {
      assert.equal(dreddRuntimeInfo.stats.passes, 0);
    });
    it('finishes with 0 skipped tests', () => {
      assert.equal(dreddRuntimeInfo.stats.skipped, 0);
    });
    it('does not record start', () => {
      assert.equal(dreddRuntimeInfo.stats.start, 0);
    });
    it('does not record end', () => {
      assert.equal(dreddRuntimeInfo.stats.end, 0);
    });
    it('does not record duration', () => {
      assert.equal(dreddRuntimeInfo.stats.duration, 0);
    });
  });
});
