const {assert} = require('chai');
const bodyParser = require('body-parser');

const {runDreddWithServer, createServer} = require('./helpers');
const Dredd = require('../../src/dredd');


describe('Sending \'application/json\' request', function() {
  let runtimeInfo = undefined;
  const contentType = 'application/json';

  before(function(done) {
    const app = createServer({bodyParser: bodyParser.text({type: contentType})});
    app.post('/data', (req, res) => res.json({test: 'OK'}));

    const path = './test/fixtures/request/application-json.apib';
    const dredd = new Dredd({options: {path}});

    return runDreddWithServer(dredd, app, function(err, info) {
      runtimeInfo = info;
      return done(err);
    });
  });

  it('results in one request being delivered to the server', () => assert.isTrue(runtimeInfo.server.requestedOnce));
  it('the request has the expected Content-Type', () => assert.equal(runtimeInfo.server.lastRequest.headers['content-type'], contentType));
  it('the request has the expected format', function() {
    const { body } = runtimeInfo.server.lastRequest;
    return assert.deepEqual(JSON.parse(body), {test: 42});
  });
  return it('results in one passing test', function() {
    assert.equal(runtimeInfo.dredd.stats.tests, 1);
    return assert.equal(runtimeInfo.dredd.stats.passes, 1);
  });
});


[{
    name: 'API Blueprint',
    path: './test/fixtures/request/multipart-form-data.apib',
    supportsContentTypes: true
  }
  , {
    name: 'Swagger',
    path: './test/fixtures/request/multipart-form-data.yaml',
    supportsContentTypes: false
  }
].forEach(apiDescription =>
  describe(`Sending 'multipart/form-data' request described in ${apiDescription.name}`, function() {
    let runtimeInfo = undefined;
    const contentType = 'multipart/form-data';

    before(function(done) {
      const app = createServer({bodyParser: bodyParser.text({type: contentType})});
      app.post('/data', (req, res) => res.json({test: 'OK'}));
      const dredd = new Dredd({options: {path: apiDescription.path}});

      return runDreddWithServer(dredd, app, function(err, info) {
        runtimeInfo = info;
        return done(err);
      });
    });

    it('results in one request being delivered to the server', () => assert.isTrue(runtimeInfo.server.requestedOnce));
    it('the request has the expected Content-Type', () => assert.include(runtimeInfo.server.lastRequest.headers['content-type'], 'multipart/form-data'));
    it('the request has the expected format', function() {
      let lines = [
        '--CUSTOM-BOUNDARY',
        'Content-Disposition: form-data; name="text"',
        'Content-Type: text/plain',
        '',
        'test equals to 42',
        '--CUSTOM-BOUNDARY',
        'Content-Disposition: form-data; name="json"',
        'Content-Type: application/json',
        '',
        '{"test": 42}',
        '',
        '--CUSTOM-BOUNDARY--',
        ''
      ];
      if (!apiDescription.supportsContentTypes) {
        lines = lines.filter(line => !line.match(/^Content-Type:/));
      }

      return assert.equal(runtimeInfo.server.lastRequest.body, lines.join('\r\n'));
    });
    return it('results in one passing test', function() {
      assert.equal(runtimeInfo.dredd.stats.tests, 1);
      return assert.equal(runtimeInfo.dredd.stats.passes, 1);
    });
  })
);


[{
    name: 'API Blueprint',
    path: './test/fixtures/request/application-x-www-form-urlencoded.apib'
  }
  , {
    name: 'Swagger',
    path: './test/fixtures/request/application-x-www-form-urlencoded.yaml'
  }
].forEach(apiDescription =>
  describe(`Sending 'application/x-www-form-urlencoded' request described in ${apiDescription.name}`, function() {
    let runtimeInfo = undefined;
    const contentType = 'application/x-www-form-urlencoded';

    before(function(done) {
      const app = createServer({bodyParser: bodyParser.text({type: contentType})});
      app.post('/data', (req, res) => res.json({test: 'OK'}));
      const dredd = new Dredd({options: {path: apiDescription.path}});

      return runDreddWithServer(dredd, app, function(err, info) {
        runtimeInfo = info;
        return done(err);
      });
    });

    it('results in one request being delivered to the server', () => assert.isTrue(runtimeInfo.server.requestedOnce));
    it('the request has the expected Content-Type', () => assert.equal(runtimeInfo.server.lastRequest.headers['content-type'], contentType));
    it('the request has the expected format', () =>
      // API Blueprint adds extra \n at the end: https://github.com/apiaryio/dredd/issues/67
      assert.equal(runtimeInfo.server.lastRequest.body.trim(), 'test=42')
    );
    return it('results in one passing test', function() {
      assert.equal(runtimeInfo.dredd.stats.tests, 1);
      return assert.equal(runtimeInfo.dredd.stats.passes, 1);
    });
  })
);


describe('Sending \'text/plain\' request', function() {
  let runtimeInfo = undefined;
  const contentType = 'text/plain';

  before(function(done) {
    const path = './test/fixtures/request/text-plain.apib';

    const app = createServer({bodyParser: bodyParser.text({type: contentType})});
    app.post('/data', (req, res) => res.json({test: 'OK'}));
    const dredd = new Dredd({options: {path}});

    return runDreddWithServer(dredd, app, function(err, info) {
      runtimeInfo = info;
      return done(err);
    });
  });

  it('results in one request being delivered to the server', () => assert.isTrue(runtimeInfo.server.requestedOnce));
  it('the request has the expected Content-Type', () => assert.equal(runtimeInfo.server.lastRequest.headers['content-type'], contentType));
  it('the request has the expected format', () => assert.equal(runtimeInfo.server.lastRequest.body, 'test equals to 42\n'));
  return it('results in one passing test', function() {
    assert.equal(runtimeInfo.dredd.stats.tests, 1);
    return assert.equal(runtimeInfo.dredd.stats.passes, 1);
  });
});
