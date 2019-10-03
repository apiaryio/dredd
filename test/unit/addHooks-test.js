import path from 'path';
import { assert } from 'chai';

import Hooks from '../../lib/Hooks';
import addHooks from '../../lib/addHooks';

const WORKING_DIRECTORY = path.join(__dirname, '..', 'fixtures');

function createTransactionRunner() {
  return {
    configuration: {
      custom: { cwd: WORKING_DIRECTORY },
    },
  };
}

describe('addHooks()', () => {
  it('sets transactionRunner.hooks', (done) => {
    const transactionRunner = createTransactionRunner();

    addHooks(transactionRunner, [], (err) => {
      assert.instanceOf(transactionRunner.hooks, Hooks);
      done(err);
    });
  });

  it('sets transactionRunner.hooks.transactions', (done) => {
    const transactionRunner = createTransactionRunner();
    const transaction1 = { name: 'My API > /resource/{id} > GET' };
    const transaction2 = { name: 'My API > /resources > POST' };

    addHooks(transactionRunner, [transaction1, transaction2], (err) => {
      assert.deepEqual(transactionRunner.hooks.transactions, {
        'My API > /resource/{id} > GET': transaction1,
        'My API > /resources > POST': transaction2,
      });
      done(err);
    });
  });

  it('sets transactionRunner.configuation.hookfiles', (done) => {
    const transactionRunner = createTransactionRunner();
    transactionRunner.configuration.hookfiles = [
      './hooks-glob/f*/*.js',
      './hooks.js',
    ];

    addHooks(transactionRunner, [], (err) => {
      assert.deepEqual(transactionRunner.configuration.hookfiles, [
        path.join(WORKING_DIRECTORY, 'hooks-glob/foo/a.js'),
        path.join(WORKING_DIRECTORY, 'hooks.js'),
        path.join(WORKING_DIRECTORY, 'hooks-glob/foo/o.js'),
        path.join(WORKING_DIRECTORY, 'hooks-glob/foo/y.js'),
      ]);
      done(err);
    });
  });

  it('propagates errors when resolving hookfiles is not possible', (done) => {
    const transactionRunner = createTransactionRunner();
    transactionRunner.configuration.hookfiles = [
      './__non-existing-directory__/non-existing-file.js',
    ];

    addHooks(transactionRunner, [], (err) => {
      assert.instanceOf(err, Error);
      assert.match(err.message, /non-existing-file\.js/);
      done();
    });
  });

  it('sets transactionRunner.hooks.configuation', (done) => {
    const transactionRunner = createTransactionRunner();
    transactionRunner.configuration.hookfiles = ['./hooks.js'];

    addHooks(transactionRunner, [], (err) => {
      assert.deepEqual(
        transactionRunner.hooks.configuration,
        transactionRunner.configuration,
      );
      done(err);
    });
  });

  it('skips hooks loading when there are no hookfiles', (done) => {
    const transactionRunner = createTransactionRunner();
    transactionRunner.configuration.hookfiles = [];
    transactionRunner.configuration.language = 'python';

    addHooks(transactionRunner, [], (err) => {
      assert.isUndefined(transactionRunner.hooks.configuration);
      done(err);
    });
  });
});
