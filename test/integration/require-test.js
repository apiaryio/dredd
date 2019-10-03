import { assert } from 'chai';

import Dredd from '../../lib/Dredd';
import { runDredd } from './helpers';

describe('Requiring user-provided modules (e.g. language compilers)', () => {
  describe('when provided with a local module', () => {
    let dreddRuntimeInfo;

    before((done) => {
      delete global.__requiredModule;

      const dredd = new Dredd({
        options: {
          path: './test/fixtures/single-get.apib',
          require: './test/fixtures/requiredModule',
        },
      });
      runDredd(dredd, (err, info) => {
        dreddRuntimeInfo = info;
        done(err);
      });
    });

    it('passes no error to the callback', () => {
      assert.isNotOk(dreddRuntimeInfo.err);
    });
    it('requires the module', () => {
      assert.isTrue(global.__requiredModule);
    });
  });

  describe('when provided with an installed module', () => {
    let dreddRuntimeInfo;

    before((done) => {
      const dredd = new Dredd({
        options: {
          path: './test/fixtures/single-get.apib',
          hookfiles: './test/fixtures/hooks-log.coffee',
          require: 'coffeescript/register',
        },
      });
      runDredd(dredd, (err, info) => {
        dreddRuntimeInfo = info;
        done(err);
      });
    });

    it('passes no error to the callback', () => {
      assert.isNotOk(dreddRuntimeInfo.err);
    });
    it('requires the module', () => {
      assert.include(dreddRuntimeInfo.logging, 'using hooks.log to debug');
    });
  });

  describe('when provided with a non-existing module', () => {
    let dreddRuntimeInfo;

    before((done) => {
      const dredd = new Dredd({
        options: {
          path: './test/fixtures/single-get.apib',
          require: 'no-such-module',
        },
      });
      runDredd(dredd, (err, info) => {
        dreddRuntimeInfo = info;
        done(err);
      });
    });

    it('passes error to the callback', () => {
      assert.instanceOf(dreddRuntimeInfo.err, Error);
    });
    it('the error is a native MODULE_NOT_FOUND error', () => {
      assert.equal(dreddRuntimeInfo.err.code, 'MODULE_NOT_FOUND');
    });
    it('the error message is descriptive', () => {
      assert.include(
        dreddRuntimeInfo.err.message,
        "Cannot find module 'no-such-module'",
      );
    });
  });
});
