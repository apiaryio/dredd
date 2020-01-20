import { assert } from 'chai';

import Dredd from '../../../lib/Dredd';
import { runDreddWithServer, createServer } from '../helpers';

const bootstrap = (configureApp) => {
    return new Promise((resolve, reject) => {
      const app = createServer();
      configureApp(app);

      const dredd = new Dredd({
        options: { path: './test/fixtures/regression-507.yaml' },
      });

      runDreddWithServer(dredd, app, (...args) => {
        const [err, runtimeInfo] = Array.from(args);

        if (err) {
          reject(err);
        }

        resolve(runtimeInfo);
      });
    });
};

describe('Regression: Issue #507', () => {
  describe('given actual body matches an enum', () => {
    let runtimeInfo;

    before(async () => {
      runtimeInfo = await bootstrap((app) => {
        runtimeInfo = app.get('/test', (req, res) =>
          res
            .status(200)
            .type('application/json')
            .json({
              color: 'red',
            }),
        );
      })
    });

    it('outputs no failures', () => {
      assert.equal(runtimeInfo.dredd.stats.failures, 0);
    });

    it('results in exactly one test', () => {
      assert.equal(runtimeInfo.dredd.stats.tests, 1);
    });

    it('results in one passing test', () => {
      assert.equal(runtimeInfo.dredd.stats.passes, 1);
    });
  });

  describe('given actual body has no nullable property', () => {
    let runtimeInfo;

    before(async () => {
      runtimeInfo = await bootstrap((app) => {
        app.get('/test', (req, res) =>
          res
            .status(200)
            .type('application/json')
            .json({
              color: null,
            }),
        );
      })
    })

    it('outputs no failures', () => {
      console.log(runtimeInfo.dredd.logging)
      assert.equal(runtimeInfo.dredd.stats.failures, 0);
    });

    it('results in exactly one test', () => {
      assert.equal(runtimeInfo.dredd.stats.tests, 1);
    });

    it('results in one passing test', () => {
      assert.equal(runtimeInfo.dredd.stats.passes, 1);
    });
  });
});
