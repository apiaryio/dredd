import clone from 'clone';
import { assert } from 'chai';
import { EventEmitter } from 'events';

import { runDredd, createServer, runDreddWithServer } from './helpers';
import Dredd from '../../lib/Dredd';

describe('Sanitation of Reported Data', () => {
  // Sample sensitive data (this value is used in API Blueprint fixtures as well)
  const sensitiveKey = 'token';
  const sensitiveHeaderName = 'authorization';
  const sensitiveValue = '5229c6e8e4b0bd7dbb07e29c';

  // Create an EventEmitter to record events sent to reporters
  function createEventEmitter(events) {
    const emitter = new EventEmitter();

    // Dredd emits 'test *' events and reporters listen on them. To test whether
    // sensitive data will or won't make it to reporters, we need to capture all
    // the emitted events. We're using 'clone' to prevent propagation of subsequent
    // modifications of the 'test' object (Dredd can change the data after they're
    // reported and by reference they would change also here in the 'events' array).
    emitter.on('test start', (test) =>
      events.push({ name: 'test start', test: clone(test) }),
    );
    emitter.on('test pass', (test) =>
      events.push({ name: 'test pass', test: clone(test) }),
    );
    emitter.on('test skip', (test) =>
      events.push({ name: 'test skip', test: clone(test) }),
    );
    emitter.on('test fail', (test) =>
      events.push({ name: 'test fail', test: clone(test) }),
    );
    emitter.on('test error', (err, test) =>
      events.push({ name: 'test error', test: clone(test), err }),
    );

    // 'start' and 'end' events are asynchronous and they do not carry any data
    // significant for following scenarios
    emitter.on('start', (apiDescriptions, cb) => {
      events.push({ name: 'start' });
      return cb();
    });
    emitter.on('end', (cb) => {
      events.push({ name: 'end' });
      return cb();
    });

    return emitter;
  }

  // Helper for preparing Dredd instance with our custom emitter
  function createDreddFromFixture(events, fixtureName) {
    return new Dredd({
      emitter: createEventEmitter(events),
      options: {
        path: `./test/fixtures/sanitation/${fixtureName}.apib`,
        hookfiles: `./test/fixtures/sanitation/${fixtureName}.js`,
      },
    });
  }

  // Helper for preparing the server under test
  function createServerFromResponse(response) {
    const app = createServer();
    app.put('/resource', (req, res) => res.json(response));
    return app;
  }

  describe('Sanitation of the Entire Request Body', () => {
    const events = [];
    let dreddRuntimeInfo;

    before((done) => {
      const dredd = createDreddFromFixture(events, 'entire-request-body');
      const app = createServerFromResponse({ name: 123 }); // 'name' should be string → failing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) {
          return done(err);
        }
        dreddRuntimeInfo = runtimeInfo.dredd;
        done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual(Array.from(events).map((event) => event.name), [
        'start',
        'test start',
        'test fail',
        'end',
      ]));
    it('emitted test data does not contain request body', () =>
      assert.equal(events[2].test.request.body, ''));
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events);
      assert.notInclude(test, sensitiveKey);
      assert.notInclude(test, sensitiveValue);
    });
    it('sensitive data cannot be found anywhere in Dredd output', () => {
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey);
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue);
    });
  });

  describe('Sanitation of the Entire Response Body', () => {
    const events = [];
    let dreddRuntimeInfo;

    before((done) => {
      const dredd = createDreddFromFixture(events, 'entire-response-body');
      const app = createServerFromResponse({ token: 123 }); // 'token' should be string → failing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) {
          return done(err);
        }
        dreddRuntimeInfo = runtimeInfo.dredd;
        done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual(Array.from(events).map((event) => event.name), [
        'start',
        'test start',
        'test fail',
        'end',
      ]));
    it('emitted test data does not contain response body', () => {
      assert.equal(events[2].test.actual.body, '');
      assert.equal(events[2].test.expected.body, '');
    });
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events);
      assert.notInclude(test, sensitiveKey);
      assert.notInclude(test, sensitiveValue);
    });
    it('sensitive data cannot be found anywhere in Dredd output', () => {
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey);
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue);
    });
  });

  describe('Sanitation of a Request Body Attribute', () => {
    const events = [];
    let dreddRuntimeInfo;

    before((done) => {
      const dredd = createDreddFromFixture(events, 'request-body-attribute');
      const app = createServerFromResponse({ name: 123 }); // 'name' should be string → failing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) {
          return done(err);
        }
        dreddRuntimeInfo = runtimeInfo.dredd;
        done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual(Array.from(events).map((event) => event.name), [
        'start',
        'test start',
        'test fail',
        'end',
      ]));
    it('emitted test data does not contain confidential body attribute', () => {
      const attrs = Object.keys(JSON.parse(events[2].test.request.body));
      assert.deepEqual(attrs, ['name']);
    });
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events);
      assert.notInclude(test, sensitiveKey);
      assert.notInclude(test, sensitiveValue);
    });
    it('sensitive data cannot be found anywhere in Dredd output', () => {
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey);
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue);
    });
  });

  describe('Sanitation of a Response Body Attribute', () => {
    const events = [];
    let dreddRuntimeInfo;

    before((done) => {
      const dredd = createDreddFromFixture(events, 'response-body-attribute');
      const app = createServerFromResponse({ token: 123, name: 'Bob' }); // 'token' should be string → failing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) {
          return done(err);
        }
        dreddRuntimeInfo = runtimeInfo.dredd;
        done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual(Array.from(events).map((event) => event.name), [
        'start',
        'test start',
        'test fail',
        'end',
      ]));
    it('emitted test data does not contain confidential body attribute', () => {
      let attrs = Object.keys(JSON.parse(events[2].test.actual.body));
      assert.deepEqual(attrs, ['name']);

      attrs = Object.keys(JSON.parse(events[2].test.expected.body));
      assert.deepEqual(attrs, ['name']);
    });
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events);
      assert.notInclude(test, sensitiveKey);
      assert.notInclude(test, sensitiveValue);
    });
    it('sensitive data cannot be found anywhere in Dredd output', () => {
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey);
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue);
    });
  });

  describe('Sanitation of Plain Text Response Body by Pattern Matching', () => {
    const events = [];
    let dreddRuntimeInfo;

    before((done) => {
      const dredd = createDreddFromFixture(events, 'plain-text-response-body');
      const app = createServerFromResponse(
        `${sensitiveKey}=42${sensitiveValue}`,
      ); // should be without '42' → failing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) {
          return done(err);
        }
        dreddRuntimeInfo = runtimeInfo.dredd;
        done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual(Array.from(events).map((event) => event.name), [
        'start',
        'test start',
        'test fail',
        'end',
      ]));
    it('emitted test data does contain the sensitive data censored', () => {
      assert.include(events[2].test.actual.body, '--- CENSORED ---');
      assert.include(events[2].test.expected.body, '--- CENSORED ---');
    });
    it('sensitive data cannot be found anywhere in the emitted test data', () =>
      assert.notInclude(JSON.stringify(events), sensitiveValue));
    it('sensitive data cannot be found anywhere in Dredd output', () =>
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue));
  });

  describe('Sanitation of Request Headers', () => {
    const events = [];
    let dreddRuntimeInfo;

    before((done) => {
      const dredd = createDreddFromFixture(events, 'request-headers');
      const app = createServerFromResponse({ name: 123 }); // 'name' should be string → failing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) {
          return done(err);
        }
        dreddRuntimeInfo = runtimeInfo.dredd;
        done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual(Array.from(events).map((event) => event.name), [
        'start',
        'test start',
        'test fail',
        'end',
      ]));
    it('emitted test data does not contain confidential header', () => {
      const names = Object.keys(events[2].test.request.headers).map((name) =>
        name.toLowerCase(),
      );
      assert.notInclude(names, sensitiveHeaderName);
    });
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events).toLowerCase();
      assert.notInclude(test, sensitiveHeaderName);
      assert.notInclude(test, sensitiveValue);
    });
    it('sensitive data cannot be found anywhere in Dredd output', () => {
      const logging = dreddRuntimeInfo.logging.toLowerCase();
      assert.notInclude(logging, sensitiveHeaderName);
      assert.notInclude(logging, sensitiveValue);
    });
  });

  describe('Sanitation of Response Headers', () => {
    const events = [];
    let dreddRuntimeInfo;

    before((done) => {
      const dredd = createDreddFromFixture(events, 'response-headers');
      const app = createServerFromResponse({ name: 'Bob' }); // Authorization header is missing → failing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) {
          return done(err);
        }
        dreddRuntimeInfo = runtimeInfo.dredd;
        done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual(Array.from(events).map((event) => event.name), [
        'start',
        'test start',
        'test fail',
        'end',
      ]));
    it('emitted test data does not contain confidential header', () => {
      let names = Object.keys(events[2].test.actual.headers).map((name) =>
        name.toLowerCase(),
      );
      assert.notInclude(names, sensitiveHeaderName);

      names = Object.keys(events[2].test.expected.headers).map((name) =>
        name.toLowerCase(),
      );
      assert.notInclude(names, sensitiveHeaderName);
    });
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events).toLowerCase();
      assert.notInclude(test, sensitiveHeaderName);
      assert.notInclude(test, sensitiveValue);
    });
    it('sensitive data cannot be found anywhere in Dredd output', () => {
      const logging = dreddRuntimeInfo.logging.toLowerCase();
      assert.notInclude(logging, sensitiveHeaderName);
      assert.notInclude(logging, sensitiveValue);
    });
  });

  describe('Sanitation of URI Parameters by Pattern Matching', () => {
    const events = [];
    let dreddRuntimeInfo;

    before((done) => {
      const dredd = createDreddFromFixture(events, 'uri-parameters');
      const app = createServerFromResponse({ name: 123 }); // 'name' should be string → failing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) {
          return done(err);
        }
        dreddRuntimeInfo = runtimeInfo.dredd;
        done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual(Array.from(events).map((event) => event.name), [
        'start',
        'test start',
        'test fail',
        'end',
      ]));
    it('emitted test data does contain the sensitive data censored', () =>
      assert.include(events[2].test.request.uri, 'CENSORED'));
    it('sensitive data cannot be found anywhere in the emitted test data', () =>
      assert.notInclude(JSON.stringify(events), sensitiveValue));
    it('sensitive data cannot be found anywhere in Dredd output', () =>
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue));
  });

  // This fails because it's not possible to do 'transaction.test = myOwnTestObject;'
  // at the moment, Dredd ignores the new object.
  describe('Sanitation of Any Content by Pattern Matching', () => {
    const events = [];
    let dreddRuntimeInfo;

    before((done) => {
      const dredd = createDreddFromFixture(
        events,
        'any-content-pattern-matching',
      );
      const app = createServerFromResponse({ name: 123 }); // 'name' should be string → failing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) {
          return done(err);
        }
        dreddRuntimeInfo = runtimeInfo.dredd;
        done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual(Array.from(events).map((event) => event.name), [
        'start',
        'test start',
        'test fail',
        'end',
      ]));
    it('emitted test data does contain the sensitive data censored', () =>
      assert.include(JSON.stringify(events), 'CENSORED'));
    it('sensitive data cannot be found anywhere in the emitted test data', () =>
      assert.notInclude(JSON.stringify(events), sensitiveValue));
    it('sensitive data cannot be found anywhere in Dredd output', () =>
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue));
  });

  describe("Ultimate 'afterEach' Guard Using Pattern Matching", () => {
    const events = [];
    let dreddRuntimeInfo;

    before((done) => {
      const dredd = createDreddFromFixture(
        events,
        'any-content-guard-pattern-matching',
      );
      const app = createServerFromResponse({ name: 123 }); // 'name' should be string → failing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) {
          return done(err);
        }
        dreddRuntimeInfo = runtimeInfo.dredd;
        done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual(Array.from(events).map((event) => event.name), [
        'start',
        'test start',
        'test fail',
        'end',
      ]));
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events);
      assert.notInclude(test, sensitiveValue);
    });
    it('sensitive data cannot be found anywhere in Dredd output', () =>
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue));
    it('custom error message is printed', () =>
      assert.include(
        dreddRuntimeInfo.logging,
        'Sensitive data would be sent to Dredd reporter',
      ));
  });

  describe('Sanitation of Test Data of Passing Transaction', () => {
    const events = [];
    let dreddRuntimeInfo;

    before((done) => {
      const dredd = createDreddFromFixture(events, 'transaction-passing');
      const app = createServerFromResponse({ name: 'Bob' }); // Passing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) {
          return done(err);
        }
        dreddRuntimeInfo = runtimeInfo.dredd;
        done();
      });
    });

    it('results in one passing test', () => {
      assert.equal(dreddRuntimeInfo.stats.passes, 1);
      assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual(Array.from(events).map((event) => event.name), [
        'start',
        'test start',
        'test pass',
        'end',
      ]));
    it('emitted test data does not contain request body', () =>
      assert.equal(events[2].test.request.body, ''));
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events);
      assert.notInclude(test, sensitiveKey);
      assert.notInclude(test, sensitiveValue);
    });
    it('sensitive data cannot be found anywhere in Dredd output', () => {
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey);
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue);
    });
  });

  describe("Sanitation of Test Data When Transaction Is Marked as Failed in 'before' Hook", () => {
    const events = [];
    let dreddRuntimeInfo;

    before((done) => {
      const dredd = createDreddFromFixture(
        events,
        'transaction-marked-failed-before',
      );

      runDredd(dredd, (...args) => {
        let err;
        // eslint-disable-next-line
        [err, dreddRuntimeInfo] = Array.from(args);
        done(err);
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual(Array.from(events).map((event) => event.name), [
        'start',
        'test start',
        'test fail',
        'end',
      ]));
    it('emitted test is failed', () => {
      assert.equal(events[2].test.status, 'fail');
      assert.include(events[2].test.errors[0].message.toLowerCase(), 'fail');
    });
    it("emitted test data results contain just 'errors' section", () =>
      assert.containsAllKeys(events[2].test, ['errors']));
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events);
      assert.notInclude(test, sensitiveKey);
      assert.notInclude(test, sensitiveValue);
    });
    it('sensitive data cannot be found anywhere in Dredd output', () => {
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey);
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue);
    });
  });

  describe("Sanitation of Test Data When Transaction Is Marked as Failed in 'after' Hook", () => {
    const events = [];
    let dreddRuntimeInfo;

    before((done) => {
      const dredd = createDreddFromFixture(
        events,
        'transaction-marked-failed-after',
      );
      const app = createServerFromResponse({ name: 'Bob' }); // Passing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) {
          return done(err);
        }
        dreddRuntimeInfo = runtimeInfo.dredd;
        done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual(Array.from(events).map((event) => event.name), [
        'start',
        'test start',
        'test fail',
        'end',
      ]));
    it('emitted test data does not contain request body', () =>
      assert.equal(events[2].test.request.body, ''));
    it('emitted test is failed', () => {
      assert.equal(events[2].test.status, 'fail');
      assert.include(events[2].test.errors[0].message.toLowerCase(), 'fail');
    });
    it('emitted test data results contain all regular sections', () => {
      assert.containsAllKeys(events[2].test, ['errors']);
      assert.hasAllKeys(events[2].test.results, ['valid', 'fields']);
      assert.hasAllKeys(events[2].test.results.fields, [
        'statusCode',
        'headers',
        'body',
      ]);
    });
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events);
      assert.notInclude(test, sensitiveKey);
      assert.notInclude(test, sensitiveValue);
    });
    it('sensitive data cannot be found anywhere in Dredd output', () => {
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey);
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue);
    });
  });

  describe('Sanitation of Test Data When Transaction Is Marked as Skipped', () => {
    const events = [];
    let dreddRuntimeInfo;

    before((done) => {
      const dredd = createDreddFromFixture(
        events,
        'transaction-marked-skipped',
      );

      runDredd(dredd, (...args) => {
        let err;
        // eslint-disable-next-line
        [err, dreddRuntimeInfo] = Array.from(args);
        done(err);
      });
    });

    it('results in one skipped test', () => {
      assert.equal(dreddRuntimeInfo.stats.skipped, 1);
      assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual(Array.from(events).map((event) => event.name), [
        'start',
        'test start',
        'test skip',
        'end',
      ]));
    it('emitted test is skipped', () => {
      assert.equal(events[2].test.status, 'skip');
      assert.containsAllKeys(events[2].test, ['errors']);
      assert.include(events[2].test.errors[0].message.toLowerCase(), 'skip');
    });
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events);
      assert.notInclude(test, sensitiveKey);
      assert.notInclude(test, sensitiveValue);
    });
    it('sensitive data cannot be found anywhere in Dredd output', () => {
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey);
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue);
    });
  });

  describe('Sanitation of Test Data of Transaction With Erroring Hooks', () => {
    const events = [];
    let dreddRuntimeInfo;

    before((done) => {
      const dredd = createDreddFromFixture(
        events,
        'transaction-erroring-hooks',
      );
      const app = createServerFromResponse({ name: 'Bob' }); // passing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) {
          return done(err);
        }
        dreddRuntimeInfo = runtimeInfo.dredd;
        done();
      });
    });

    it('results in one erroring test', () => {
      assert.equal(dreddRuntimeInfo.stats.errors, 1);
      assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual(Array.from(events).map((event) => event.name), [
        'start',
        'test start',
        'test error',
        'end',
      ]));
    it('sensitive data leak to emitted test data', () => {
      const test = JSON.stringify(events);
      assert.include(test, sensitiveKey);
      assert.include(test, sensitiveValue);
    });
    it('sensitive data leak to Dredd output', () => {
      assert.include(dreddRuntimeInfo.logging, sensitiveKey);
      assert.include(dreddRuntimeInfo.logging, sensitiveValue);
    });
  });

  describe('Sanitation of Test Data of Transaction With Secured Erroring Hooks', () => {
    const events = [];
    let dreddRuntimeInfo;

    before((done) => {
      const dredd = createDreddFromFixture(
        events,
        'transaction-secured-erroring-hooks',
      );
      const app = createServerFromResponse({ name: 'Bob' }); // passing test

      runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) {
          return done(err);
        }
        dreddRuntimeInfo = runtimeInfo.dredd;
        done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual(Array.from(events).map((event) => event.name), [
        'start',
        'test start',
        'test fail',
        'end',
      ]));
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events);
      assert.notInclude(test, sensitiveKey);
      assert.notInclude(test, sensitiveValue);
    });
    it('sensitive data cannot be found anywhere in Dredd output', () => {
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey);
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue);
    });
    it('custom error message is printed', () =>
      assert.include(
        dreddRuntimeInfo.logging,
        'Unexpected exception in hooks',
      ));
  });
});
