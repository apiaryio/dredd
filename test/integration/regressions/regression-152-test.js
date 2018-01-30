const {assert} = require('chai');

const Dredd = require('../../../src/dredd');
const {runDreddWithServer, createServer} = require('../helpers');


describe('Regression: Issue #152', () =>
  describe('Modify transaction object inside beforeAll combined with beforeEach helper', function() {
    let runtimeInfo = undefined;

    before(function(done) {
      const app = createServer();
      app.get('/machines', (req, res) => res.json([{type: 'bulldozer', name: 'willy'}]));

      const dredd = new Dredd({
        options: {
          path: './test/fixtures/single-get.apib',
          hookfiles: './test/fixtures/regression-152.coffee'
        }
      });

      return runDreddWithServer(dredd, app, function(...args) {
        let err;
        [err, runtimeInfo] = Array.from(args);
        return done(err);
      });
    });

    return it('should modify the transaction with hooks', () => assert.deepEqual(Object.keys(runtimeInfo.server.requests), ['/machines?api-key=23456']));
  })
);
