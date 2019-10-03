import * as bodyParser from 'body-parser';
import { assert } from 'chai';
import fs from 'fs';
import * as path from 'path';

import { runDreddWithServer, createServer } from './helpers';
import Dredd from '../../lib/Dredd';

describe("Sending 'application/json' request", () => {
  let runtimeInfo;
  const contentType = 'application/json';

  before((done) => {
    const app = createServer({
      bodyParser: bodyParser.text({ type: contentType }),
    });
    app.post('/data', (req, res) => res.json({ test: 'OK' }));

    const dredd = new Dredd({
      options: { path: './test/fixtures/request/application-json.apib' },
    });

    runDreddWithServer(dredd, app, (err, info) => {
      runtimeInfo = info;
      done(err);
    });
  });

  it('results in one request being delivered to the server', () =>
    assert.isTrue(runtimeInfo.server.requestedOnce));
  it('the request has the expected Content-Type', () =>
    assert.equal(
      runtimeInfo.server.lastRequest.headers['content-type'],
      contentType,
    ));
  it('the request has the expected format', () => {
    const { body } = runtimeInfo.server.lastRequest;
    assert.deepEqual(JSON.parse(body), { test: 42 });
  });
  it('results in one passing test', () => {
    assert.equal(runtimeInfo.dredd.stats.tests, 1);
    assert.equal(runtimeInfo.dredd.stats.passes, 1);
  });
});

describe("Sending 'multipart/form-data' request described in API Blueprint", () => {
  let runtimeInfo;
  const contentType = 'multipart/form-data';

  before((done) => {
    const app = createServer({
      bodyParser: bodyParser.text({ type: contentType }),
    });
    app.post('/data', (req, res) => res.json({ test: 'OK' }));
    const dredd = new Dredd({
      options: { path: './test/fixtures/request/multipart-form-data.apib' },
    });

    runDreddWithServer(dredd, app, (err, info) => {
      runtimeInfo = info;
      done(err);
    });
  });

  it('results in one request being delivered to the server', () =>
    assert.isTrue(runtimeInfo.server.requestedOnce));
  it('the request has the expected Content-Type', () =>
    assert.include(
      runtimeInfo.server.lastRequest.headers['content-type'],
      'multipart/form-data',
    ));
  it('the request has the expected format', () => {
    const lines = [
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
      '',
    ];
    assert.equal(runtimeInfo.server.lastRequest.body, lines.join('\r\n'));
  });
  it('results in one passing test', () => {
    assert.equal(runtimeInfo.dredd.stats.tests, 1);
    assert.equal(runtimeInfo.dredd.stats.passes, 1);
  });
});

describe("Sending 'multipart/form-data' request described in OpenAPI 2", () => {
  let runtimeInfo;
  const contentType = 'multipart/form-data';

  before((done) => {
    const app = createServer({
      bodyParser: bodyParser.text({ type: contentType }),
    });
    app.post('/data', (req, res) => res.json({ test: 'OK' }));
    const dredd = new Dredd({
      options: { path: './test/fixtures/request/multipart-form-data.yaml' },
    });

    runDreddWithServer(dredd, app, (err, info) => {
      runtimeInfo = info;
      done(err);
    });
  });

  it('results in one request being delivered to the server', () =>
    assert.isTrue(runtimeInfo.server.requestedOnce));
  it('the request has the expected Content-Type', () =>
    assert.include(
      runtimeInfo.server.lastRequest.headers['content-type'],
      'multipart/form-data',
    ));
  it('the request has the expected format', () => {
    const lines = [
      '--CUSTOM-BOUNDARY',
      'Content-Disposition: form-data; name="text"',
      '',
      'test equals to 42',
      '--CUSTOM-BOUNDARY',
      'Content-Disposition: form-data; name="json"',
      '',
      '{"test": 42}',
      '',
      '--CUSTOM-BOUNDARY--',
      '',
    ];
    assert.equal(runtimeInfo.server.lastRequest.body, lines.join('\r\n'));
  });
  it('results in one passing test', () => {
    assert.equal(runtimeInfo.dredd.stats.tests, 1);
    assert.equal(runtimeInfo.dredd.stats.passes, 1);
  });
});

describe("Sending 'multipart/form-data' request described as 'file' in OpenAPI 2", () => {
  let runtimeInfo;
  const contentType = 'multipart/form-data';

  before((done) => {
    const app = createServer({
      bodyParser: bodyParser.text({ type: contentType }),
    });
    app.post('/data', (req, res) => res.json({ test: 'OK' }));
    const dredd = new Dredd({
      options: {
        path: './test/fixtures/request/multipart-form-data-file.yaml',
      },
    });

    runDreddWithServer(dredd, app, (err, info) => {
      runtimeInfo = info;
      done(err);
    });
  });

  it('results in one request being delivered to the server', () =>
    assert.isTrue(runtimeInfo.server.requestedOnce));
  it('the request has the expected Content-Type', () =>
    assert.include(
      runtimeInfo.server.lastRequest.headers['content-type'],
      'multipart/form-data',
    ));
  it('the request has the expected format', () => {
    const lines = [
      '--BOUNDARY',
      'Content-Disposition: form-data; name="text"',
      '',
      'test equals to 42',
      '--BOUNDARY',
      'Content-Disposition: form-data; name="json"',
      '',
      '{"test": 42}',
      '',
      '--BOUNDARY--',
      '',
    ];
    assert.equal(runtimeInfo.server.lastRequest.body, lines.join('\r\n'));
  });
  it('results in one passing test', () => {
    assert.equal(runtimeInfo.dredd.stats.tests, 1);
    assert.equal(runtimeInfo.dredd.stats.passes, 1);
  });
});
[
  {
    name: 'API Blueprint',
    path: './test/fixtures/request/application-x-www-form-urlencoded.apib',
  },
  {
    name: 'OpenAPI 2',
    path: './test/fixtures/request/application-x-www-form-urlencoded.yaml',
  },
].forEach((apiDescription) => {
  describe(`Sending 'application/x-www-form-urlencoded' request described in ${apiDescription.name}`, () => {
    let runtimeInfo;
    const contentType = 'application/x-www-form-urlencoded';

    before((done) => {
      const app = createServer({
        bodyParser: bodyParser.text({ type: contentType }),
      });
      app.post('/data', (req, res) => res.json({ test: 'OK' }));
      const dredd = new Dredd({ options: { path: apiDescription.path } });

      runDreddWithServer(dredd, app, (err, info) => {
        runtimeInfo = info;
        done(err);
      });
    });

    it('results in one request being delivered to the server', () => {
      assert.isTrue(runtimeInfo.server.requestedOnce);
    });
    it('the request has the expected Content-Type', () => {
      assert.equal(
        runtimeInfo.server.lastRequest.headers['content-type'],
        contentType,
      );
    });
    it('the request has the expected format', () => {
      // API Blueprint adds extra \n at the end: https://github.com/apiaryio/dredd/issues/67
      assert.equal(runtimeInfo.server.lastRequest.body.trim(), 'test=42');
    });
    it('results in one passing test', () => {
      assert.equal(runtimeInfo.dredd.stats.tests, 1);
      assert.equal(runtimeInfo.dredd.stats.passes, 1);
    });
  });
});

describe("Sending 'text/plain' request", () => {
  let runtimeInfo;
  const contentType = 'text/plain';

  before((done) => {
    const app = createServer({
      bodyParser: bodyParser.text({ type: contentType }),
    });
    app.post('/data', (req, res) => res.json({ test: 'OK' }));
    const dredd = new Dredd({
      options: { path: './test/fixtures/request/text-plain.apib' },
    });

    runDreddWithServer(dredd, app, (err, info) => {
      runtimeInfo = info;
      done(err);
    });
  });

  it('results in one request being delivered to the server', () => {
    assert.isTrue(runtimeInfo.server.requestedOnce);
  });
  it('the request has the expected Content-Type', () => {
    assert.equal(
      runtimeInfo.server.lastRequest.headers['content-type'],
      contentType,
    );
  });
  it('the request has the expected format', () => {
    assert.equal(runtimeInfo.server.lastRequest.body, 'test equals to 42\n');
  });
  it('results in one passing test', () => {
    assert.equal(runtimeInfo.dredd.stats.tests, 1);
    assert.equal(runtimeInfo.dredd.stats.passes, 1);
  });
});
[
  {
    name: 'API Blueprint',
    path: './test/fixtures/request/application-octet-stream.apib',
  },
  {
    name: 'OpenAPI 2',
    path: './test/fixtures/request/application-octet-stream.yaml',
  },
].forEach((apiDescription) =>
  describe(`Sending 'application/octet-stream' request described in ${apiDescription.name}`, () => {
    let runtimeInfo;
    const contentType = 'application/octet-stream';

    before((done) => {
      const app = createServer({
        bodyParser: bodyParser.raw({ type: contentType }),
      });
      app.post('/binary', (req, res) => res.json({ test: 'OK' }));

      const dredd = new Dredd({
        options: {
          path: apiDescription.path,
          hookfiles:
            './test/fixtures/request/application-octet-stream-hooks.js',
        },
      });
      runDreddWithServer(dredd, app, (err, info) => {
        runtimeInfo = info;
        done(err);
      });
    });

    it('results in one request being delivered to the server', () =>
      assert.isTrue(runtimeInfo.server.requestedOnce));
    it('the request has the expected Content-Type', () =>
      assert.equal(
        runtimeInfo.server.lastRequest.headers['content-type'],
        contentType,
      ));
    it('the request has the expected format', () =>
      assert.equal(
        runtimeInfo.server.lastRequest.body.toString('base64'),
        Buffer.from([0xff, 0xef, 0xbf, 0xbe]).toString('base64'),
      ));
    it('results in one passing test', () => {
      assert.equal(runtimeInfo.dredd.stats.tests, 1);
      assert.equal(runtimeInfo.dredd.stats.passes, 1);
    });
  }),
);
[
  {
    name: 'API Blueprint',
    path: './test/fixtures/request/image-png.apib',
  },
  {
    name: 'OpenAPI 2',
    path: './test/fixtures/request/image-png.yaml',
  },
].forEach((apiDescription) =>
  describe(`Sending 'image/png' request described in ${apiDescription.name}`, () => {
    let runtimeInfo;
    const contentType = 'image/png';

    before((done) => {
      const app = createServer({
        bodyParser: bodyParser.raw({ type: contentType }),
      });
      app.put('/image.png', (req, res) => res.json({ test: 'OK' }));

      const dredd = new Dredd({
        options: {
          path: apiDescription.path,
          hookfiles: './test/fixtures/request/image-png-hooks.js',
        },
      });
      runDreddWithServer(dredd, app, (err, info) => {
        runtimeInfo = info;
        done(err);
      });
    });

    it('results in one request being delivered to the server', () =>
      assert.isTrue(runtimeInfo.server.requestedOnce));
    it('the request has the expected Content-Type', () =>
      assert.equal(
        runtimeInfo.server.lastRequest.headers['content-type'],
        contentType,
      ));
    it('the request has the expected format', () =>
      assert.equal(
        runtimeInfo.server.lastRequest.body.toString('base64'),
        fs
          .readFileSync(path.join(__dirname, '../fixtures/image.png'))
          .toString('base64'),
      ));
    it('results in one passing test', () => {
      assert.equal(runtimeInfo.dredd.stats.tests, 1);
      assert.equal(runtimeInfo.dredd.stats.passes, 1);
    });
  }),
);
