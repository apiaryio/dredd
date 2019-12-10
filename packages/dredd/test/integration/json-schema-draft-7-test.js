import { assert } from 'chai';

import Dredd from '../../lib/Dredd';
import { runDreddWithServer, createServer } from './helpers';

describe('Given API Blueprint with JSON Schema Draft 7', () => {
  describe('given explicit version of JSON Schema', () => {
    const FIXTURE_PATH = './test/fixtures/json-schema-draft-7.apib';

    describe('given actual data matches the schema', () => {
      let runtimeInfo;

      before((done) => {
        const app = createServer();
        app.get('/machines', (req, res) => {
          res.json([{ type: 'bulldozer', name: 'willy' }]);
        });

        const dredd = new Dredd({
          path: FIXTURE_PATH,
        });

        runDreddWithServer(dredd, app, (error, info) => {
          runtimeInfo = info;
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
          path: FIXTURE_PATH,
        });

        runDreddWithServer(dredd, app, (error, info) => {
          runtimeInfo = info;
          done(error);
        });
      });

      it('should result into 1 failing test', () => {
        assert.equal(runtimeInfo.dredd.stats.failures, 1);
      });

      it('should output an error about unknown "type" enum value', () => {
        assert.match(
          runtimeInfo.dredd.logging,
          /data\/0\/type should be equal to constant/,
        );
      });
    });
  });

  describe('given a single Boolean value as a JSON Schema', () => {
    const FIXTURE_PATH = './test/fixtures/json-schema-draft-7-boolean.apib';

    describe('given schema equals "true"', () => {
      let runtimeInfo;

      before((done) => {
        const app = createServer();
        app.get('/machines/:id', (req, res) => {
          const { id } = req.params;
          const machines = [{ type: 'bulldozer', name: 'willy' }];
          res.json(machines[id] || {});
        });

        const dredd = new Dredd({
          path: FIXTURE_PATH,
        });

        runDreddWithServer(dredd, app, (error, info) => {
          runtimeInfo = info;
          done(error);
        });
      });

      it('should recognize schema as Draft 7', () => {
        // No invalid schema version error from Gavel and no failing tests
        // implies the schema version was properly inferred as Draft 7.
        assert.notMatch(runtimeInfo.dredd.logging, /not a valid draft/);
        assert.equal(
          runtimeInfo.dredd.stats.failures + runtimeInfo.dredd.stats.errors,
          0,
        );
      });

      it('should always result into passing test', () => {
        assert.equal(runtimeInfo.dredd.stats.passes, 1);
      });
    });
  });
});
