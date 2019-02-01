const { assert } = require('chai');
const Dredd = require('../../lib/Dredd');

const {
  createServer, DEFAULT_SERVER_PORT, runDredd,
} = require('./helpers');

const APIARY_PORT = DEFAULT_SERVER_PORT + 1;

const API_DESCRIPTION = './test/fixtures/single-get.apib';

describe('Dredd requiring language compilers', () => {
  let apiary;

  before((done) => {
    const app = createServer();

    app.post('/apis/*', (req, res) => res.json({
      _id: '1234_id',
      testRunId: '6789_testRunId',
      reportUrl: 'http://example.com/test/run/1234_id',
    }));

    app.all('*', (req, res) => res.json({}));

    apiary = app.listen(APIARY_PORT, (err) => {
      done(err);
    });
  });

  after(done => apiary.close(done));

  it('should work with CoffeScript', (done) => {
    const dredd = new Dredd({
      options: {
        path: [API_DESCRIPTION],
        hookfiles: ['./test/fixtures/hooks-log.coffee'],
        require: 'coffeescript/register',
      },
    });

    runDredd(dredd, APIARY_PORT, (error, info) => {
      assert.include(info.logging, 'using hooks.log to debug');
      done();
    });
  });

  it('should handle non-existing modules', (done) => {
    const dredd = new Dredd({
      options: {
        path: [API_DESCRIPTION],
        hookfiles: ['./test/fixtures/hooks-log.coffee'],
        require: 'no-such-module',
      },
    });

    runDredd(dredd, APIARY_PORT, (error, info) => {
      assert.equal(info.err.code, 'MODULE_NOT_FOUND');
      assert.equal(info.err.message, 'Cannot find module \'no-such-module\'');
      assert.equal(info.logging, 'error: Error requiring module \'no-such-module\': Cannot find module \'no-such-module\'\n');
      done();
    });
  });
});
