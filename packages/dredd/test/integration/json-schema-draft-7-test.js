import { assert } from 'chai';

import Dredd from '../../lib/Dredd';
import { runDreddWithServer, createServer } from './helpers';

describe('Given API Blueprint with JSON Schema Draft 7', () => {
  describe('given actual data matches the schema', () => {
    let runtimeInfo;

    before((done) => {
      const app = createServer();
      app.get('/machines', (req, res) => {
        res.json([{ type: 'bulldozer', name: 'willy' }]);
      });

      const dredd = new Dredd({
        path: './test/fixtures/json-schema-draft-7.apib',
      });

      runDreddWithServer(dredd, app, (...args) => {
        let error;
        [error, runtimeInfo] = Array.from(args);
        done(error);
      });
    });

    it('should output no failures or errors', () => {
      assert.equal(
        runtimeInfo.dredd.stats.failures + runtimeInfo.dredd.stats.errors,
        0,
      );
    });

    it('should result into passing test', () => {
      assert.equal(runtimeInfo.dredd.stats.passes, 1);
    });
  });

  describe('given actual data does not match the schema', () => {
    let runtimeInfo;

    before((done) => {
      const app = createServer();
      app.get('/machines', (req, res) => {
        res.json([{ type: 'unknown', name: 'willy' }]);
      });

      const dredd = new Dredd({
        path: './test/fixtures/json-schema-draft-7.apib',
      });

      runDreddWithServer(dredd, app, (...args) => {
        let error;
        [error, runtimeInfo] = Array.from(args);
        done(error);
      });
    });

    it('should result into 1 failing test', () => {
      assert.equal(runtimeInfo.dredd.stats.failures, 1);
    });

    it('should output an error about unknown "type" enum value', () => {
      assert.match(
        runtimeInfo.dredd.logging,
        /data\/0\/type should be equal to one of the allowed values/,
      );
    });
  });
});
