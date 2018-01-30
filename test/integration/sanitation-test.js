/* eslint-disable
    guard-for-in,
    no-unused-vars,
    prefer-const,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
const { assert } = require('chai');
const clone = require('clone');
const { EventEmitter } = require('events');

const { runDredd, createServer, runDreddWithServer } = require('./helpers');
const Dredd = require('../../src/dredd');


describe('Sanitation of Reported Data', () => {
  // sample sensitive data (this value is used in API Blueprint fixtures as well)
  const sensitiveKey = 'token';
  const sensitiveHeaderName = 'authorization';
  const sensitiveValue = '5229c6e8e4b0bd7dbb07e29c';

  // recording events sent to reporters
  let events;
  let emitter;

  beforeEach(() => {
    events = [];
    emitter = new EventEmitter();

    // Dredd emits 'test *' events and reporters listen on them. To test whether
    // sensitive data will or won't make it to reporters, we need to capture all
    // the emitted events. We're using 'clone' to prevent propagation of subsequent
    // modifications of the 'test' object (Dredd can change the data after they're
    // reported and by reference they would change also here in the 'events' array).
    emitter.on('test start', test => events.push({ name: 'test start', test: clone(test) }));
    emitter.on('test pass', test => events.push({ name: 'test pass', test: clone(test) }));
    emitter.on('test skip', test => events.push({ name: 'test skip', test: clone(test) }));
    emitter.on('test fail', test => events.push({ name: 'test fail', test: clone(test) }));
    emitter.on('test error', (err, test) => events.push({ name: 'test error', test: clone(test), err }));

    // 'start' and 'end' events are asynchronous and they do not carry any data
    // significant for following scenarios
    emitter.on('start', (apiDescription, cb) => { events.push({ name: 'start' }); return cb(); });
    return emitter.on('end', (cb) => { events.push({ name: 'end' }); return cb(); });
  });

  // helper for preparing Dredd instance with our custom emitter
  const createDreddFromFixture = fixtureName =>
    new Dredd({
      emitter,
      options: {
        path: `./test/fixtures/sanitation/${fixtureName}.apib`,
        hookfiles: `./test/fixtures/sanitation/${fixtureName}.js`
      }
    })
  ;

  // helper for preparing the server under test
  const createServerFromResponse = function (response) {
    const app = createServer();
    app.put('/resource', (req, res) => res.json(response));
    return app;
  };


  describe('Sanitation of the Entire Request Body', () => {
    let dreddRuntimeInfo;

    beforeEach((done) => {
      const dredd = createDreddFromFixture('entire-request-body');
      const app = createServerFromResponse({ name: 123 }); // 'name' should be string → failing test

      return runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) { return done(err); }
        dreddRuntimeInfo = runtimeInfo.dredd;
        return done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      return assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual((Array.from(events).map(event => event.name)), [
        'start', 'test start', 'test fail', 'end'
      ])
    );
    it('emitted test data does not contain request body', () => assert.equal(events[2].test.request.body, ''));
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events);
      assert.notInclude(test, sensitiveKey);
      return assert.notInclude(test, sensitiveValue);
    });
    return it('sensitive data cannot be found anywhere in Dredd output', () => {
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey);
      return assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue);
    });
  });

  describe('Sanitation of the Entire Response Body', () => {
    let dreddRuntimeInfo;

    beforeEach((done) => {
      const dredd = createDreddFromFixture('entire-response-body');
      const app = createServerFromResponse({ token: 123 }); // 'token' should be string → failing test

      return runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) { return done(err); }
        dreddRuntimeInfo = runtimeInfo.dredd;
        return done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      return assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual((Array.from(events).map(event => event.name)), [
        'start', 'test start', 'test fail', 'end'
      ])
    );
    it('emitted test data does not contain response body', () => {
      assert.equal(events[2].test.actual.body, '');
      return assert.equal(events[2].test.expected.body, '');
    });
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events);
      assert.notInclude(test, sensitiveKey);
      return assert.notInclude(test, sensitiveValue);
    });
    return it('sensitive data cannot be found anywhere in Dredd output', () => {
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey);
      return assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue);
    });
  });

  describe('Sanitation of a Request Body Attribute', () => {
    let dreddRuntimeInfo;

    beforeEach((done) => {
      const dredd = createDreddFromFixture('request-body-attribute');
      const app = createServerFromResponse({ name: 123 }); // 'name' should be string → failing test

      return runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) { return done(err); }
        dreddRuntimeInfo = runtimeInfo.dredd;
        return done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      return assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual((Array.from(events).map(event => event.name)), [
        'start', 'test start', 'test fail', 'end'
      ])
    );
    it('emitted test data does not contain confidential body attribute', () => {
      const attrs = Object.keys(JSON.parse(events[2].test.request.body));
      return assert.deepEqual(attrs, ['name']);
    });
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events);
      assert.notInclude(test, sensitiveKey);
      return assert.notInclude(test, sensitiveValue);
    });
    return it('sensitive data cannot be found anywhere in Dredd output', () => {
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey);
      return assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue);
    });
  });

  describe('Sanitation of a Response Body Attribute', () => {
    let dreddRuntimeInfo;

    beforeEach((done) => {
      const dredd = createDreddFromFixture('response-body-attribute');
      const app = createServerFromResponse({ token: 123, name: 'Bob' }); // 'token' should be string → failing test

      return runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) { return done(err); }
        dreddRuntimeInfo = runtimeInfo.dredd;
        return done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      return assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual((Array.from(events).map(event => event.name)), [
        'start', 'test start', 'test fail', 'end'
      ])
    );
    it('emitted test data does not contain confidential body attribute', () => {
      let attrs = Object.keys(JSON.parse(events[2].test.actual.body));
      assert.deepEqual(attrs, ['name']);

      attrs = Object.keys(JSON.parse(events[2].test.expected.body));
      return assert.deepEqual(attrs, ['name']);
    });
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events);
      assert.notInclude(test, sensitiveKey);
      return assert.notInclude(test, sensitiveValue);
    });
    return it('sensitive data cannot be found anywhere in Dredd output', () => {
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey);
      return assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue);
    });
  });

  describe('Sanitation of Plain Text Response Body by Pattern Matching', () => {
    let dreddRuntimeInfo;

    beforeEach((done) => {
      const dredd = createDreddFromFixture('plain-text-response-body');
      const app = createServerFromResponse(`${sensitiveKey}=42${sensitiveValue}`); // should be without '42' → failing test

      return runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) { return done(err); }
        dreddRuntimeInfo = runtimeInfo.dredd;
        return done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      return assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual((Array.from(events).map(event => event.name)), [
        'start', 'test start', 'test fail', 'end'
      ])
    );
    it('emitted test data does contain the sensitive data censored', () => {
      assert.include(events[2].test.actual.body, '--- CENSORED ---');
      return assert.include(events[2].test.expected.body, '--- CENSORED ---');
    });
    it('sensitive data cannot be found anywhere in the emitted test data', () => assert.notInclude(JSON.stringify(events), sensitiveValue));
    return it('sensitive data cannot be found anywhere in Dredd output', () => assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue));
  });

  describe('Sanitation of Request Headers', () => {
    let dreddRuntimeInfo;

    beforeEach((done) => {
      const dredd = createDreddFromFixture('request-headers');
      const app = createServerFromResponse({ name: 123 }); // 'name' should be string → failing test

      return runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) { return done(err); }
        dreddRuntimeInfo = runtimeInfo.dredd;
        return done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      return assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual((Array.from(events).map(event => event.name)), [
        'start', 'test start', 'test fail', 'end'
      ])
    );
    it('emitted test data does not contain confidential header', () => {
      const names = ((() => {
        const result = [];
        for (const name in events[2].test.request.headers) {
          result.push(name.toLowerCase());
        }
        return result;
      })());
      return assert.notInclude(names, sensitiveHeaderName);
    });
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events).toLowerCase();
      assert.notInclude(test, sensitiveHeaderName);
      return assert.notInclude(test, sensitiveValue);
    });
    return it('sensitive data cannot be found anywhere in Dredd output', () => {
      const logging = dreddRuntimeInfo.logging.toLowerCase();
      assert.notInclude(logging, sensitiveHeaderName);
      return assert.notInclude(logging, sensitiveValue);
    });
  });

  describe('Sanitation of Response Headers', () => {
    let dreddRuntimeInfo;

    beforeEach((done) => {
      const dredd = createDreddFromFixture('response-headers');
      const app = createServerFromResponse({ name: 'Bob' }); // Authorization header is missing → failing test

      return runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) { return done(err); }
        dreddRuntimeInfo = runtimeInfo.dredd;
        return done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      return assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual((Array.from(events).map(event => event.name)), [
        'start', 'test start', 'test fail', 'end'
      ])
    );
    it('emitted test data does not contain confidential header', () => {
      let name;
      let names = ((() => {
        const result = [];
        for (name in events[2].test.actual.headers) {
          result.push(name.toLowerCase());
        }
        return result;
      })());
      assert.notInclude(names, sensitiveHeaderName);

      names = ((() => {
        const result1 = [];
        for (name in events[2].test.expected.headers) {
          result1.push(name.toLowerCase());
        }
        return result1;
      })());
      return assert.notInclude(names, sensitiveHeaderName);
    });
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events).toLowerCase();
      assert.notInclude(test, sensitiveHeaderName);
      return assert.notInclude(test, sensitiveValue);
    });
    return it('sensitive data cannot be found anywhere in Dredd output', () => {
      const logging = dreddRuntimeInfo.logging.toLowerCase();
      assert.notInclude(logging, sensitiveHeaderName);
      return assert.notInclude(logging, sensitiveValue);
    });
  });

  describe('Sanitation of URI Parameters by Pattern Matching', () => {
    let dreddRuntimeInfo;

    beforeEach((done) => {
      const dredd = createDreddFromFixture('uri-parameters');
      const app = createServerFromResponse({ name: 123 }); // 'name' should be string → failing test

      return runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) { return done(err); }
        dreddRuntimeInfo = runtimeInfo.dredd;
        return done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      return assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual((Array.from(events).map(event => event.name)), [
        'start', 'test start', 'test fail', 'end'
      ])
    );
    it('emitted test data does contain the sensitive data censored', () => assert.include(events[2].test.request.uri, 'CENSORED'));
    it('sensitive data cannot be found anywhere in the emitted test data', () => assert.notInclude(JSON.stringify(events), sensitiveValue));
    return it('sensitive data cannot be found anywhere in Dredd output', () => assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue));
  });

  // This fails because it's not possible to do 'transaction.test = myOwnTestObject;'
  // at the moment, Dredd ignores the new object.
  describe('Sanitation of Any Content by Pattern Matching', () => {
    let dreddRuntimeInfo;

    beforeEach((done) => {
      const dredd = createDreddFromFixture('any-content-pattern-matching');
      const app = createServerFromResponse({ name: 123 }); // 'name' should be string → failing test

      return runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) { return done(err); }
        dreddRuntimeInfo = runtimeInfo.dredd;
        return done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      return assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual((Array.from(events).map(event => event.name)), [
        'start', 'test start', 'test fail', 'end'
      ])
    );
    it('emitted test data does contain the sensitive data censored', () => assert.include(JSON.stringify(events), 'CENSORED'));
    it('sensitive data cannot be found anywhere in the emitted test data', () => assert.notInclude(JSON.stringify(events), sensitiveValue));
    return it('sensitive data cannot be found anywhere in Dredd output', () => assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue));
  });

  describe('Ultimate \'afterEach\' Guard Using Pattern Matching', () => {
    let dreddRuntimeInfo;

    beforeEach((done) => {
      const dredd = createDreddFromFixture('any-content-guard-pattern-matching');
      const app = createServerFromResponse({ name: 123 }); // 'name' should be string → failing test

      return runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) { return done(err); }
        dreddRuntimeInfo = runtimeInfo.dredd;
        return done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      return assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual((Array.from(events).map(event => event.name)), [
        'start', 'test start', 'test fail', 'end'
      ])
    );
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events);
      return assert.notInclude(test, sensitiveValue);
    });
    it('sensitive data cannot be found anywhere in Dredd output', () => assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue));
    return it('custom error message is printed', () => assert.include(dreddRuntimeInfo.logging, 'Sensitive data would be sent to Dredd reporter'));
  });

  describe('Sanitation of Test Data of Passing Transaction', () => {
    let dreddRuntimeInfo;

    beforeEach((done) => {
      const dredd = createDreddFromFixture('transaction-passing');
      const app = createServerFromResponse({ name: 'Bob' }); // passing test

      return runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) { return done(err); }
        dreddRuntimeInfo = runtimeInfo.dredd;
        return done();
      });
    });

    it('results in one passing test', () => {
      assert.equal(dreddRuntimeInfo.stats.passes, 1);
      return assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual((Array.from(events).map(event => event.name)), [
        'start', 'test start', 'test pass', 'end'
      ])
    );
    it('emitted test data does not contain request body', () => assert.equal(events[2].test.request.body, ''));
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events);
      assert.notInclude(test, sensitiveKey);
      return assert.notInclude(test, sensitiveValue);
    });
    return it('sensitive data cannot be found anywhere in Dredd output', () => {
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey);
      return assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue);
    });
  });

  describe('Sanitation of Test Data When Transaction Is Marked as Failed in \'before\' Hook', () => {
    let dreddRuntimeInfo;

    beforeEach((done) => {
      const dredd = createDreddFromFixture('transaction-marked-failed-before');

      return runDredd(dredd, (...args) => {
        let err;
        [err, dreddRuntimeInfo] = Array.from(args);
        return done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      return assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual((Array.from(events).map(event => event.name)), [
        'start', 'test start', 'test fail', 'end'
      ])
    );
    it('emitted test is failed', () => {
      assert.equal(events[2].test.status, 'fail');
      return assert.include(events[2].test.results.general.results[0].message.toLowerCase(), 'fail');
    });
    it('emitted test data results contain just \'general\' section', () => assert.deepEqual(Object.keys(events[2].test.results), ['general']));
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events);
      assert.notInclude(test, sensitiveKey);
      return assert.notInclude(test, sensitiveValue);
    });
    return it('sensitive data cannot be found anywhere in Dredd output', () => {
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey);
      return assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue);
    });
  });

  describe('Sanitation of Test Data When Transaction Is Marked as Failed in \'after\' Hook', () => {
    let dreddRuntimeInfo;

    beforeEach((done) => {
      const dredd = createDreddFromFixture('transaction-marked-failed-after');
      const app = createServerFromResponse({ name: 'Bob' }); // passing test

      return runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) { return done(err); }
        dreddRuntimeInfo = runtimeInfo.dredd;
        return done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      return assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual((Array.from(events).map(event => event.name)), [
        'start', 'test start', 'test fail', 'end'
      ])
    );
    it('emitted test data does not contain request body', () => assert.equal(events[2].test.request.body, ''));
    it('emitted test is failed', () => {
      assert.equal(events[2].test.status, 'fail');
      return assert.include(events[2].test.results.general.results[0].message.toLowerCase(), 'fail');
    });
    it('emitted test data results contain all regular sections', () => assert.deepEqual(Object.keys(events[2].test.results), ['general', 'headers', 'body', 'statusCode']));
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events);
      assert.notInclude(test, sensitiveKey);
      return assert.notInclude(test, sensitiveValue);
    });
    return it('sensitive data cannot be found anywhere in Dredd output', () => {
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey);
      return assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue);
    });
  });

  describe('Sanitation of Test Data When Transaction Is Marked as Skipped', () => {
    let dreddRuntimeInfo;

    beforeEach((done) => {
      const dredd = createDreddFromFixture('transaction-marked-skipped');

      return runDredd(dredd, (...args) => {
        let err;
        [err, dreddRuntimeInfo] = Array.from(args);
        return done();
      });
    });

    it('results in one skipped test', () => {
      assert.equal(dreddRuntimeInfo.stats.skipped, 1);
      return assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual((Array.from(events).map(event => event.name)), [
        'start', 'test start', 'test skip', 'end'
      ])
    );
    it('emitted test is skipped', () => {
      assert.equal(events[2].test.status, 'skip');
      assert.deepEqual(Object.keys(events[2].test.results), ['general']);
      return assert.include(events[2].test.results.general.results[0].message.toLowerCase(), 'skip');
    });
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events);
      assert.notInclude(test, sensitiveKey);
      return assert.notInclude(test, sensitiveValue);
    });
    return it('sensitive data cannot be found anywhere in Dredd output', () => {
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey);
      return assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue);
    });
  });

  describe('Sanitation of Test Data of Transaction With Erroring Hooks', () => {
    let dreddRuntimeInfo;

    beforeEach((done) => {
      const dredd = createDreddFromFixture('transaction-erroring-hooks');
      const app = createServerFromResponse({ name: 'Bob' }); // passing test

      return runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) { return done(err); }
        dreddRuntimeInfo = runtimeInfo.dredd;
        return done();
      });
    });

    it('results in one erroring test', () => {
      assert.equal(dreddRuntimeInfo.stats.errors, 1);
      return assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual((Array.from(events).map(event => event.name)), [
        'start', 'test start', 'test error', 'end'
      ])
    );
    it('sensitive data leak to emitted test data', () => {
      const test = JSON.stringify(events);
      assert.include(test, sensitiveKey);
      return assert.include(test, sensitiveValue);
    });
    return it('sensitive data leak to Dredd output', () => {
      assert.include(dreddRuntimeInfo.logging, sensitiveKey);
      return assert.include(dreddRuntimeInfo.logging, sensitiveValue);
    });
  });

  return describe('Sanitation of Test Data of Transaction With Secured Erroring Hooks', () => {
    let dreddRuntimeInfo;

    beforeEach((done) => {
      const dredd = createDreddFromFixture('transaction-secured-erroring-hooks');
      const app = createServerFromResponse({ name: 'Bob' }); // passing test

      return runDreddWithServer(dredd, app, (err, runtimeInfo) => {
        if (err) { return done(err); }
        dreddRuntimeInfo = runtimeInfo.dredd;
        return done();
      });
    });

    it('results in one failed test', () => {
      assert.equal(dreddRuntimeInfo.stats.failures, 1);
      return assert.equal(dreddRuntimeInfo.stats.tests, 1);
    });
    it('emits expected events in expected order', () =>
      assert.deepEqual((Array.from(events).map(event => event.name)), [
        'start', 'test start', 'test fail', 'end'
      ])
    );
    it('sensitive data cannot be found anywhere in the emitted test data', () => {
      const test = JSON.stringify(events);
      assert.notInclude(test, sensitiveKey);
      return assert.notInclude(test, sensitiveValue);
    });
    it('sensitive data cannot be found anywhere in Dredd output', () => {
      assert.notInclude(dreddRuntimeInfo.logging, sensitiveKey);
      return assert.notInclude(dreddRuntimeInfo.logging, sensitiveValue);
    });
    return it('custom error message is printed', () => assert.include(dreddRuntimeInfo.logging, 'Unexpected exception in hooks'));
  });
});
