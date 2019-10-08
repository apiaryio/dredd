import { assert } from 'chai';
import * as path from 'path';

import { runDreddWithServer, createServer } from './helpers';
import Dredd from '../../lib/Dredd';

const files = [
  {
    name: 'API Blueprint',
    path: './test/fixtures/response/empty-body-empty-schema.apib',
  },
  {
    name: 'OpenAPI 2',
    path: './test/fixtures/response/empty-body-empty-schema.yaml',
  },
];

files.forEach((apiDescription) =>
  describe(`Specifying neither response body nor schema in the ${apiDescription.name}`, () => {
    describe('when the server returns non-empty responses', () => {
      let runtimeInfo;

      before((done) => {
        const app = createServer();
        app.get('/resource.json', (req, res) => res.json({ test: 'OK' }));
        app.get('/resource.csv', (req, res) =>
          res.type('text/csv').send('test,OK\n'),
        );
        const dredd = new Dredd({ options: { path: apiDescription.path } });
        runDreddWithServer(dredd, app, (err, info) => {
          runtimeInfo = info;
          done(err);
        });
      });

      it('evaluates the responses as valid', () =>
        assert.deepInclude(runtimeInfo.dredd.stats, { tests: 2, passes: 2 }));
    });

    describe('when the server returns empty responses', () => {
      let runtimeInfo;

      before((done) => {
        const app = createServer();
        app.get('/resource.json', (req, res) => res.type('json').send());
        app.get('/resource.csv', (req, res) => res.type('text/csv').send());
        const dredd = new Dredd({ options: { path: apiDescription.path } });
        runDreddWithServer(dredd, app, (err, info) => {
          runtimeInfo = info;
          done(err);
        });
      });

      it('evaluates the responses as valid', () =>
        assert.deepInclude(runtimeInfo.dredd.stats, { tests: 2, passes: 2 }));
    });
  }),
);
[
  {
    name: 'API Blueprint',
    path: './test/fixtures/response/empty-body.apib',
  },
  {
    name: 'OpenAPI 2',
    path: './test/fixtures/response/empty-body.yaml',
  },
].forEach((apiDescription) =>
  describe(`Specifying no response body in the ${apiDescription.name}, but specifying a schema`, () => {
    describe('when the server returns a response not valid according to the schema', () => {
      let runtimeInfo;

      before((done) => {
        const app = createServer();
        app.get('/resource', (req, res) => res.json({ name: 123 }));
        const dredd = new Dredd({ options: { path: apiDescription.path } });
        runDreddWithServer(dredd, app, (err, info) => {
          runtimeInfo = info;
          done(err);
        });
      });

      it('evaluates the response as invalid', () =>
        assert.deepInclude(runtimeInfo.dredd.stats, { tests: 1, failures: 1 }));
      it('prints JSON Schema validation error', () =>
        assert.include(
          runtimeInfo.dredd.logging,
          "At '/name' Invalid type: number (expected string)",
        ));
    });

    describe('when the server returns a response valid according to the schema', () => {
      let runtimeInfo;

      before((done) => {
        const app = createServer();
        app.get('/resource', (req, res) => res.json({ name: 'test' }));
        const dredd = new Dredd({ options: { path: apiDescription.path } });
        runDreddWithServer(dredd, app, (err, info) => {
          runtimeInfo = info;
          done(err);
        });
      });

      it('evaluates the response as valid', () =>
        assert.deepInclude(runtimeInfo.dredd.stats, { tests: 1, passes: 1 }));
    });
  }),
);
[
  {
    name: 'API Blueprint',
    path: './test/fixtures/response/empty-body-empty-schema.apib',
  },
  {
    name: 'OpenAPI 2',
    path: './test/fixtures/response/empty-body-empty-schema.yaml',
  },
].forEach((apiDescription) =>
  describe(`Specifying no response body in the ${apiDescription.name} and having hooks ensuring empty response`, () => {
    describe('when the server returns a non-empty responses', () => {
      let runtimeInfo;

      before((done) => {
        const app = createServer();
        app.get('/resource.json', (req, res) => res.json({ test: 'OK' }));
        app.get('/resource.csv', (req, res) =>
          res.type('text/csv').send('test,OK\n'),
        );
        const dredd = new Dredd({
          options: {
            path: apiDescription.path,
            hookfiles: './test/fixtures/response/empty-body-hooks.js',
          },
        });
        runDreddWithServer(dredd, app, (err, info) => {
          runtimeInfo = info;
          done(err);
        });
      });

      it('evaluates the responses as invalid', () =>
        assert.deepInclude(runtimeInfo.dredd.stats, { tests: 2, failures: 2 }));
      it('prints the error message from hooks', () =>
        assert.include(
          runtimeInfo.dredd.logging,
          'The response body must be empty',
        ));
    });

    describe('when the server returns an empty responses', () => {
      let runtimeInfo;

      before((done) => {
        const app = createServer();
        app.get('/resource.json', (req, res) => res.send());
        app.get('/resource.csv', (req, res) => res.type('text/csv').send());
        const dredd = new Dredd({
          options: {
            path: apiDescription.path,
            hookfiles: './test/fixtures/response/empty-body-hooks.js',
          },
        });
        runDreddWithServer(dredd, app, (err, info) => {
          runtimeInfo = info;
          done(err);
        });
      });

      it('evaluates the responses as valid', () =>
        assert.deepInclude(runtimeInfo.dredd.stats, { tests: 2, passes: 2 }));
    });
  }),
);
[
  {
    name: 'API Blueprint',
    path: './test/fixtures/response/empty-body-empty-schema.apib',
  },
  {
    name: 'OpenAPI 2',
    path: './test/fixtures/response/empty-body-empty-schema.yaml',
  },
].forEach((apiDescription) =>
  describe(`Specifying no response body in the ${apiDescription.name} and having hooks ensuring empty response`, () => {
    describe('when the server returns non-empty responses', () => {
      let runtimeInfo;

      before((done) => {
        const app = createServer();
        app.get('/resource.json', (req, res) => res.json({ test: 'OK' }));
        app.get('/resource.csv', (req, res) =>
          res.type('text/csv').send('test,OK\n'),
        );
        const dredd = new Dredd({
          options: {
            path: apiDescription.path,
            hookfiles: './test/fixtures/response/empty-body-hooks.js',
          },
        });
        runDreddWithServer(dredd, app, (err, info) => {
          runtimeInfo = info;
          done(err);
        });
      });

      it('evaluates the responses as invalid', () =>
        assert.deepInclude(runtimeInfo.dredd.stats, { tests: 2, failures: 2 }));
      it('prints the error message from hooks', () =>
        assert.include(
          runtimeInfo.dredd.logging,
          'The response body must be empty',
        ));
    });

    describe('when the server returns empty responses', () => {
      let runtimeInfo;

      before((done) => {
        const app = createServer();
        app.get('/resource.json', (req, res) => res.send());
        app.get('/resource.csv', (req, res) => res.type('text/csv').send());
        const dredd = new Dredd({
          options: {
            path: apiDescription.path,
            hookfiles: './test/fixtures/response/empty-body-hooks.js',
          },
        });
        runDreddWithServer(dredd, app, (err, info) => {
          runtimeInfo = info;
          done(err);
        });
      });

      it('evaluates the responses as valid', () =>
        assert.deepInclude(runtimeInfo.dredd.stats, { tests: 2, passes: 2 }));
    });
  }),
);
[
  {
    name: 'API Blueprint',
    path: './test/fixtures/response/204-205-body.apib',
  },
  {
    name: 'OpenAPI 2',
    path: './test/fixtures/response/204-205-body.yaml',
  },
].forEach((apiDescription) =>
  describe(`Working with HTTP 204 and 205 responses in the ${apiDescription.name}`, () => {
    describe('when the actual response is non-empty', () => {
      let runtimeInfo;

      before((done) => {
        // It's not trivial to create an actual server sending HTTP 204 or 205
        // with non-empty body, because it's against specs. That's why we're
        // returning HTTP 200 here and in the assertions we're making sure
        // the failures are there only because of non-matching status codes.
        const app = createServer();
        app.get('*', (req, res) => res.type('text/plain').send('test\n'));

        const dredd = new Dredd({ options: { path: apiDescription.path } });
        runDreddWithServer(dredd, app, (err, info) => {
          runtimeInfo = info;
          done(err);
        });
      });

      it('evaluates all the responses as invalid', () =>
        assert.deepInclude(runtimeInfo.dredd.stats, { tests: 4, failures: 4 }));
      it('prints four warnings for each of the responses', () =>
        assert.equal(
          runtimeInfo.dredd.logging.match(
            /HTTP 204 and 205 responses must not include a message body/g,
          ).length,
          4,
        ));
      it('prints four failures for each non-matching status code', () =>
        assert.equal(
          runtimeInfo.dredd.logging.match(
            /fail: statusCode: Expected status code '\d+', but got '200'./g,
          ).length,
          4,
        ));
      it('does not print any failures regarding response bodies', () =>
        assert.isNull(runtimeInfo.dredd.logging.match(/fail: body:/g)));
    });

    describe('when the actual response is empty', () => {
      let runtimeInfo;

      before((done) => {
        // It's not trivial to create an actual server sending HTTP 204 or 205
        // sending a Content-Type header, because it's against specs. That's
        // why we're returning HTTP 200 here and in the assertions we're making
        // sure the extra failures are there only because of non-matching status
        // codes.
        const app = createServer();
        app.get('*', (req, res) => res.type('text/plain').send());

        const dredd = new Dredd({ options: { path: apiDescription.path } });
        runDreddWithServer(dredd, app, (err, info) => {
          runtimeInfo = info;
          done(err);
        });
      });

      it('evaluates all the responses as invalid', () =>
        assert.deepInclude(runtimeInfo.dredd.stats, { tests: 4, failures: 4 }));
      it('prints two warnings for each of the non-empty expectations', () =>
        assert.equal(
          runtimeInfo.dredd.logging.match(
            /HTTP 204 and 205 responses must not include a message body/g,
          ).length,
          2,
        ));
      it('prints two failures for each non-matching body (and status code)', () =>
        assert.equal(
          runtimeInfo.dredd.logging.match(
            /fail: body: Actual and expected data do not match.\nstatusCode: Expected status code '\d+', but got '200'./g,
          ).length,
          2,
        ));
      it('prints two failures for each non-matching status code', () =>
        assert.equal(
          runtimeInfo.dredd.logging.match(
            /fail: statusCode: Expected status code '\d+', but got '200'./g,
          ).length,
          2,
        ));
    });
  }),
);
[
  {
    name: 'API Blueprint',
    path: './test/fixtures/response/binary.apib',
  },
  {
    name: 'OpenAPI 2',
    path: './test/fixtures/response/binary.yaml',
  },
].forEach((apiDescription) =>
  describe(`Working with binary responses in the ${apiDescription.name}`, () => {
    const imagePath = path.join(__dirname, '../fixtures/image.png');
    const app = createServer();
    app.get('/image.png', (req, res) =>
      res.type('image/png').sendFile(imagePath),
    );

    describe('when the body is described as empty and there are hooks to remove the real body', () => {
      let runtimeInfo;

      before((done) => {
        const dredd = new Dredd({
          options: {
            path: apiDescription.path,
            hookfiles: './test/fixtures/response/binary-ignore-body-hooks.js',
          },
        });
        runDreddWithServer(dredd, app, (err, info) => {
          runtimeInfo = info;
          done(err);
        });
      });

      it('evaluates the response as valid', () =>
        assert.deepInclude(runtimeInfo.dredd.stats, { tests: 1, passes: 1 }));
    });

    describe('when the body is described as empty and there are hooks to assert the real body', () => {
      let runtimeInfo;

      before((done) => {
        const dredd = new Dredd({
          options: {
            path: apiDescription.path,
            hookfiles: './test/fixtures/response/binary-assert-body-hooks.js',
          },
        });
        runDreddWithServer(dredd, app, (err, info) => {
          runtimeInfo = info;
          done(err);
        });
      });

      it('evaluates the response as valid', () =>
        assert.deepInclude(runtimeInfo.dredd.stats, { tests: 1, passes: 1 }));
    });
  }),
);
