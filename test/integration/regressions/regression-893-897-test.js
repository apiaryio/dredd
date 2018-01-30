const {assert} = require('chai');

const Dredd = require('../../../src/dredd');
const {runDreddWithServer, createServer} = require('../helpers');


describe('Regression: Issue #893 and #897', function() {
  describe('when the response has no explicit status code', function() {
    let runtimeInfo = undefined;

    before(function(done) {
      const app = createServer();
      app.get('/resource', (req, res) => res.json({name: 'Honza', color: 'green'}));

      const dredd = new Dredd({options: {path: './test/fixtures/regression-893.yaml'}});
      return runDreddWithServer(dredd, app, function(...args) {
        let err;
        [err, runtimeInfo] = Array.from(args);
        return done(err);
      });
    });

    it('outputs no failures or errors', () => assert.equal(runtimeInfo.dredd.stats.failures + runtimeInfo.dredd.stats.errors, 0));
    it('results in exactly one test', () => assert.equal(runtimeInfo.dredd.stats.tests, 1));
    return it('results in one passing test (HTTP 200 is assumed)', () => assert.equal(runtimeInfo.dredd.stats.passes, 1));
  });

  describe('when the response has no explicit schema and it has empty body', function() {
    let runtimeInfo = undefined;

    before(function(done) {
      const app = createServer();
      app.get('/resource', (req, res) => res.json({name: 'Honza', color: 'green'}));
      app.get('/resource.csv', (req, res) => res.type('text/csv').send('name,color\nHonza,green\n'));

      const dredd = new Dredd({options: {path: './test/fixtures/regression-897-body.yaml'}});
      return runDreddWithServer(dredd, app, function(...args) {
        let err;
        [err, runtimeInfo] = Array.from(args);
        return done(err);
      });
    });

    it('outputs no failures or errors', () => assert.equal(runtimeInfo.dredd.stats.failures + runtimeInfo.dredd.stats.errors, 0));
    it('results in exactly two tests', () => assert.equal(runtimeInfo.dredd.stats.tests, 2));
    return it('results in two passing tests (body is not validated)', () => assert.equal(runtimeInfo.dredd.stats.passes, 2));
  });

  return describe('when the response has no explicit schema', function() {
    let runtimeInfo = undefined;

    before(function(done) {
      const app = createServer();
      app.get('/resource', (req, res) => res.json({name: 'Honza', color: 'green'}));
      app.get('/resource.csv', (req, res) => res.type('text/csv').send('name,color\nHonza,green\n'));

      const dredd = new Dredd({options: {path: './test/fixtures/regression-897-schema.yaml'}});
      return runDreddWithServer(dredd, app, function(...args) {
        let err;
        [err, runtimeInfo] = Array.from(args);
        return done(err);
      });
    });

    it('outputs no failures or errors', () => assert.equal(runtimeInfo.dredd.stats.failures + runtimeInfo.dredd.stats.errors, 0));
    it('results in exactly two tests', () => assert.equal(runtimeInfo.dredd.stats.tests, 2));
    return it('results in two passing tests', () => assert.equal(runtimeInfo.dredd.stats.passes, 2));
  });
});
