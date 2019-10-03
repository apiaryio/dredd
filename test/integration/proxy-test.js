import http from 'http';
import url from 'url';
import { assert } from 'chai';

import {
  runDredd,
  recordLogging,
  createServer,
  DEFAULT_SERVER_PORT,
} from './helpers';
import Dredd from '../../lib/Dredd';

const PROXY_PORT = DEFAULT_SERVER_PORT + 1;
const PROXY_URL = `http://127.0.0.1:${PROXY_PORT}`;
const SERVER_HOST = `127.0.0.1:${DEFAULT_SERVER_PORT}`;
const DUMMY_URL = 'http://example.com';
const REGULAR_HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'];

function unsetAllProxyEnvVars(env) {
  Object.keys(env)
    .filter((envName) => envName.toLowerCase().includes('proxy'))
    .forEach((envName) => delete env[envName]);
}

// Normally, tests create Dredd instance and pass it to the 'runDredd'
// helper, which captures Dredd's logging while it runs. However, in
// this case we need to capture logging also during the instantiation.
function createAndRunDredd(configuration, done) {
  if (!configuration.options) {
    configuration.options = {};
  }
  configuration.options.color = false;
  configuration.options.loglevel = 'debug';

  let dredd;
  recordLogging(
    (next) => {
      dredd = new Dredd(configuration);
      dredd.configuration.http.strictSSL = false;
      next();
    },
    (err, args, dreddInitLogging) =>
      runDredd(dredd, (error, info) => {
        info.logging = `${dreddInitLogging}\n${info.logging}`;
        done(error, info);
      }),
  );
}

// Creates dummy proxy server for given protocol. Records details
// about the first received request to the object given as a second
// argument.
function createProxyServer(protocol, proxyRequestInfo) {
  let app;
  if (protocol === 'http') {
    app = http.createServer();
    app.on('request', (req, res) => {
      proxyRequestInfo.url = req.url;
      proxyRequestInfo.method = req.method;

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    });
  } else if (protocol === 'https') {
    // Uses the 'http' module as well, because otherwise we would
    // need to grapple with certificates in the test. Using 'http'
    // for running the proxy doesn't affect anything. The important
    // difference is whether the URLs requested by Dredd start with
    // 'http://' or 'https://'.
    //
    // See https://en.wikipedia.org/wiki/HTTP_tunnel#HTTP_CONNECT_tunneling
    // and https://github.com/request/request#proxies
    app = http.createServer();
    app.on('connect', (req, socket) => {
      proxyRequestInfo.url = req.url;
      proxyRequestInfo.method = req.method;

      socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      socket.destroy();
    });
  } else {
    throw new Error(`Unsupported protocol: ${protocol}`);
  }
  return app;
}

// Runs a single scenario. Options:
//
// - protocol (enum)
//     - http
//     - https
// - configureDredd (function) - Gets object with Dredd config
// - expectedLog (string) - String to be expected in Dredd's output
// - expectedDestination (enum) - Which destination is Dredd expected to hit
//     - proxy - Means Dredd is expected to hit proxy
//     - server - Means Dredd is expected to hit the dummy server
// - expectedUrl (string) - Which URL is Dredd expected to request
function test(scenario) {
  // Setup and prepare dummy proxy
  let proxy;
  let proxyRequestInfo = {};

  before((done) => {
    const app = createProxyServer(scenario.protocol, proxyRequestInfo);
    proxy = app.listen(PROXY_PORT, done);
  });
  after((done) => {
    proxyRequestInfo = {};
    proxy.close(done);
  });

  // Setup and prepare dummy server
  let server;
  let serverRuntimeInfo;

  before((done) => {
    const app = createServer({ protocol: scenario.protocol });
    server = app.listen(DEFAULT_SERVER_PORT, (err, info) => {
      serverRuntimeInfo = info;
      done(err);
    });
  });
  after((done) => {
    serverRuntimeInfo = undefined;
    server.close(done);
  });

  // Setup and run Dredd
  let dreddLogging;

  before((done) => {
    const configuration = { options: {} };
    scenario.configureDredd(configuration);

    createAndRunDredd(configuration, (err, info) => {
      if (err) {
        return done(err);
      }
      dreddLogging = info.logging;
      done();
    });
  });

  // Assertions...
  it('logs the proxy settings', () =>
    assert.include(dreddLogging, scenario.expectedLog));
  it('recommends user to read the documentation about using HTTP(S) proxies', () =>
    assert.include(dreddLogging, '#using-https-proxy'));

  if (scenario.expectedDestination === 'proxy') {
    it('does not request the server', () =>
      assert.isFalse(serverRuntimeInfo.requested));
    it('does request the proxy', () =>
      assert.notDeepEqual(proxyRequestInfo, {}));

    if (scenario.protocol === 'http') {
      it('requests the proxy with regular HTTP method', () =>
        assert.oneOf(proxyRequestInfo.method, REGULAR_HTTP_METHODS));
      it('requests the proxy, using the original URL as a path', () =>
        assert.equal(proxyRequestInfo.url, scenario.expectedUrl));
      return;
    }
    if (scenario.protocol === 'https') {
      it('requests the proxy with CONNECT', () =>
        assert.equal(proxyRequestInfo.method, 'CONNECT'));
      it('asks the proxy to tunnel SSL connection to the original hostname', () => {
        const hostname = `${
          url.parse(scenario.expectedUrl).hostname
        }:${DEFAULT_SERVER_PORT}`;
        assert.equal(proxyRequestInfo.url, hostname);
      });
      return;
    }
    throw new Error(`Unsupported protocol: ${scenario.protocol}`);
  } else if (scenario.expectedDestination === 'server') {
    it('does not request the proxy', () =>
      assert.deepEqual(proxyRequestInfo, {}));
    it('does request the server', () =>
      assert.isTrue(serverRuntimeInfo.requestedOnce));
    it('requests the server with regular HTTP method', () =>
      assert.oneOf(serverRuntimeInfo.lastRequest.method, REGULAR_HTTP_METHODS));
    it('requests the server with the original path', () =>
      assert.equal(serverRuntimeInfo.lastRequest.url, scenario.expectedUrl));
  } else {
    throw new Error(`Unsupported destination: ${scenario.expectedDestination}`);
  }
}

['http', 'https'].forEach((protocol) => {
  const serverUrl = `${protocol}://${SERVER_HOST}`;

  describe(`Respecting ‘${protocol}_proxy’ Environment Variable`, () => {
    const expectedLog = `\
proxy specified by environment variables: \
${protocol}_proxy=${PROXY_URL}\
`;

    before(() => {
      unsetAllProxyEnvVars(process.env);
      process.env[`${protocol}_proxy`] = PROXY_URL;
    });
    after(() => unsetAllProxyEnvVars(process.env));

    describe('Requesting Server Under Test', () =>
      test({
        protocol,
        configureDredd(configuration) {
          configuration.loglevel = 'debug';
          configuration.server = serverUrl;
          configuration.options.path = './test/fixtures/single-get.apib';
        },
        expectedLog,
        expectedDestination: 'server',
        expectedUrl: '/machines',
      }));

    describe('Using Apiary Reporter', () => {
      before(() => {
        process.env.APIARY_API_URL = serverUrl;
      });
      after(() => delete process.env.APIARY_API_URL);

      test({
        protocol,
        configureDredd(configuration) {
          configuration.server = DUMMY_URL;
          configuration.options.path = './test/fixtures/single-get.apib';
          configuration.options.reporter = ['apiary'];
        },
        expectedLog,
        expectedDestination: 'proxy',
        expectedUrl: `${serverUrl}/apis/public/tests/runs`,
      });
    });

    describe('Downloading API Description Document', () =>
      test({
        protocol,
        configureDredd(configuration) {
          configuration.server = DUMMY_URL;
          configuration.options.path = `${serverUrl}/example.apib`;
        },
        expectedLog,
        expectedDestination: 'proxy',
        expectedUrl: `${serverUrl}/example.apib`,
      }));
  });
});

describe('Respecting ‘no_proxy’ Environment Variable', () => {
  const serverUrl = `http://${SERVER_HOST}`;
  const expectedLog = `\
proxy specified by environment variables: \
http_proxy=${PROXY_URL}, no_proxy=${SERVER_HOST}\
`;

  before(() => {
    unsetAllProxyEnvVars(process.env);
    process.env.http_proxy = PROXY_URL;
    process.env.no_proxy = SERVER_HOST;
  });
  after(() => unsetAllProxyEnvVars(process.env));

  describe('Requesting Server Under Test', () =>
    test({
      protocol: 'http',
      configureDredd(configuration) {
        configuration.loglevel = 'debug';
        configuration.server = serverUrl;
        configuration.options.path = './test/fixtures/single-get.apib';
      },
      expectedLog,
      expectedDestination: 'server',
      expectedUrl: '/machines',
    }));

  describe('Using Apiary Reporter', () => {
    before(() => {
      process.env.APIARY_API_URL = serverUrl;
    });
    after(() => delete process.env.APIARY_API_URL);

    test({
      protocol: 'http',
      configureDredd(configuration) {
        configuration.server = DUMMY_URL;
        configuration.options.path = './test/fixtures/single-get.apib';
        configuration.options.reporter = ['apiary'];
      },
      expectedLog,
      expectedDestination: 'server',
      expectedUrl: '/apis/public/tests/runs',
    });
  });

  describe('Downloading API Description Document', () =>
    test({
      protocol: 'http',
      configureDredd(configuration) {
        configuration.server = DUMMY_URL;
        configuration.options.path = `${serverUrl}/example.apib`;
      },
      expectedLog,
      expectedDestination: 'server',
      expectedUrl: '/example.apib',
    }));
});
